import pandas as pd
import random
import uuid
import os
import sys


def generate_mock_response(survey_path=None, metadata=None):
    if survey_path is not None:
        survey = pd.read_excel(
            survey_path,
            sheet_name="survey",
            keep_default_na=False,
        )
        choices = pd.read_excel(
            survey_path,
            sheet_name="choices",
            keep_default_na=False,
        )

    submission_xml = ""
    xml_level = 1
    group_at_level = []

    repeat_rows = identify_repeat_locations(survey)
    repeat_start_rows = [x[0] for x in repeat_rows]

    for survey_row in range(len(survey)):
        if survey_row not in [
            item for sublist in repeat_rows for item in sublist
        ]:  # just to avoid repeating the repeat rows
            response = generate_random_row(
                submission_xml,
                survey,
                choices,
                survey_row,
                xml_level,
                group_at_level,
            )
            submission_xml = response["submission_xml"]
            xml_level = response["xml_level"]
            group_at_level = response["group_at_level"]
            print(xml_level, group_at_level)

        if survey_row in repeat_start_rows:
            loop_xml = adding_looped_data(
                survey,
                choices,
                rows=repeat_rows[
                    repeat_start_rows.index(
                        survey_row,
                    )
                ],
            )
            loop_xml = print_chunk_with_tab_spacing(loop_xml, xml_level)
            submission_xml += loop_xml

    submission_xml = add_headers_and_footers(
        metadata, submission_xml, survey_path=survey_path
    )

    return submission_xml


def adding_looped_data(survey, choices, rows):
    repeat_loop_xml = "\n"
    repeat_name = survey.loc[rows[0], "name"]
    number_of_loops = random.randint(1, 5)

    repeat_loop_xml += f"<{repeat_name}_count>{number_of_loops}\
      </{repeat_name}_count>"

    for i in range(number_of_loops):
        repeat_loop_xml += f"\n<{repeat_name}>"

        loop_name = survey.loc[rows[1], "name"]
        repeat_loop_xml += f"\n    <{loop_name}>{i}</{loop_name}>"

        repeat_group_row_start = rows[2]
        repeat_group_row_end = survey[
            (survey["name"] == survey.loc[rows[0], "name"])
            & (survey["type"] == "end group")
        ].index.tolist()[0]

        xml_level = 2
        group_at_level = ["", ""]
        for repeat_row in range(
            repeat_group_row_start,
            repeat_group_row_end + 1,
        ):
            response = generate_random_row(
                repeat_loop_xml,
                survey,
                choices,
                repeat_row,
                xml_level,
                group_at_level,
            )
            repeat_loop_xml = response["submission_xml"]
            xml_level = response["xml_level"]
            group_at_level = response["group_at_level"]

        repeat_loop_xml += f"\n</{repeat_name}>"

    return repeat_loop_xml


def print_chunk_with_tab_spacing(xml_string, xml_level):
    spaces = generate_tab_spaces(xml_level)
    xml_string = xml_string.replace("\n", f"\n{spaces}")
    return xml_string


def identify_repeat_locations(survey):
    repeat_starts = survey[survey["type"] == "begin_repeat"].index.tolist()
    repeat_ends = survey[survey["type"] == "end_repeat"].index.tolist()

    if len(repeat_starts) != len(repeat_ends):
        raise ValueError(
            "There are not the same number of repeat starts and ends.",
        )

    repeat_columns = [
        list(range(repeat_starts[i], repeat_ends[i] + 1))
        for i in range(len(repeat_starts))
    ]
    return repeat_columns


def generate_random_row(
    submission_xml, survey, choices, survey_row, xml_level, group_at_level
):
    spaces = generate_tab_spaces(xml_level)

    if survey.loc[survey_row, "type"] == "begin _group":
        xml_level += 1
        group = survey.loc[survey_row, "name"]
        group_at_level.append(group)
        submission_xml += f"\n{spaces}<{group}>"

    if survey.loc[survey_row, "type"] == "end group":
        spaces = generate_tab_spaces(xml_level - 1)
        group = group_at_level[xml_level]

        submission_xml += f"\n{spaces}</{group}>"
        xml_level -= 1

    question_type = survey.loc[survey_row, "type"].split(" ")[0]

    if question_type == "select_multiple":
        name = survey.loc[survey_row, "name"]
        row_for_choices_sheet = (
            choices["list_name"]
            == survey.loc[
                survey_row,
                "type",
            ].split(
                " "
            )[1]
        )

        question_options = choices.loc[row_for_choices_sheet, "name"].tolist()
        selection = select_multiple(question_options)
        selection = " ".join(selection)

        submission_xml += f"\n{spaces}<{name}>{selection}</{name}>"

    if question_type == "select_one":
        name = survey.loc[survey_row, "name"]
        row_for_choices_sheet = (
            choices["list_name"]
            == survey.loc[
                survey_row,
                "type",
            ].split(
                " "
            )[1]
        )

        question_options = choices.loc[row_for_choices_sheet, "name"].tolist()
        selection = random.choice(question_options)

        submission_xml += f"\n{spaces}<{name}>{selection}</{name}>"

    if question_type in ["integer", "text", "decimal"]:
        if question_type == "integer":
            random_int = random.randint(1, 1000)
        elif question_type == "text":
            random_number_of_characters = random.randint(1, 100)
            alphabet = list(" abcdefghijklmnopqrstuvwxyz.!")
            words = "".join(
                random.choices(
                    alphabet,
                    k=random_number_of_characters,
                )
            )
        else:  # decimal
            random_decimal = round(random.uniform(0, 500), 2)

        name = survey.loc[survey_row, "name"]
        submission_xml += f"\n{spaces}<{name}>"
        if question_type == "integer":
            submission_xml += f"{random_int}"
        elif question_type == "text":
            submission_xml += f"{words}"
        else:  # decimal
            submission_xml += f"{random_decimal}"
        submission_xml += f"</{name}>"

    return {
        "submission_xml": submission_xml,
        "xml_level": xml_level,
        "group_at_level": group_at_level,
    }


def generate_tab_spaces(form_level):
    return " " * ((form_level - 1) * 4)


def select_multiple(list_to_sample):
    number_to_choose_from = random.randint(1, len(list_to_sample))
    samples = random.sample(list_to_sample, number_to_choose_from)
    return samples


def add_headers_and_footers(metadata, xml_string, survey_path=None):
    if survey_path is not None:
        metadata = pd.read_excel(survey_path, sheet_name="settings")

    id_val = metadata.loc[0, "form_id"]
    version_val = metadata.loc[0, "version"]
    header_1 = '<?xml version="1.0" encoding="UTF-8"?>'
    data_header = f'<data version="{version_val}" id="{id_val}"\
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"\
    xmlns:jr="http://openrosa.org/javarosa"\
    xmlns:h="http://www.w3.org/1999/xhtml"\
    xmlns:odk="http://www.opendatakit.org/xforms"\
    xmlns:orx="http://openrosa.org/xforms"\
    xmlns:ev="http://www.w3.org/2001/xml-events">'
    instance_id = str(uuid.uuid4())
    random_number_of_characters = random.randint(1, 100)
    alphabet = list(" abcdefghijklmnopqrstuvwxyz.!")
    instance_name = "".join(
        random.choices(
            alphabet,
            k=random_number_of_characters,
        )
    )
    metadata_footer = f"    <meta>\n\
                      <instanceID>uuid:{instance_id}</instanceID>\n\
                                        <instanceName>{instance_name}</instanceName>\n\
                                                  </meta>"
    footer = "</data>"

    xml_string = print_chunk_with_tab_spacing(xml_string, 2)

    xml_string = f"{header_1}\n{data_header}\n{xml_string}\n\
      {metadata_footer}\n{footer}"
    return xml_string


args = sys.argv[1:]

if len(args) > 2:
    raise ValueError(
        "Incorrect number of arguments.\n"
        "Need to supply 4 arguments when calling this function from the\
            command line (in this order):\n"
        "1. The name of the form you are generating data for.\n"
        "2. The number of responses you would like to generate\
            (999 if not generating data).\n"
    )

xls_file_path = os.path.abspath(args[0])

xls_file_name, _ = os.path.basename(xls_file_path).split(".")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

mock_responses = os.path.join(BASE_DIR, "public")

try:
    number_of_mock_responses = int(args[1])
except IndexError:
    number_of_mock_responses = 1

# Writing fake data and saving the responses
for i in range(1, number_of_mock_responses + 1):
    xml_str = generate_mock_response(survey_path=xls_file_path)
    file_name = f"{xls_file_name}_mock_data_{i}.xml"
    if not os.path.exists(mock_responses):
        os.makedirs(mock_responses)
    with open(os.path.join(mock_responses, file_name), "w") as file:
        file.write(xml_str)
        print("Done...", file.name)
