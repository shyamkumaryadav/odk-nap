#!/usr/bin/env python3

import argparse
import datetime
import os
import pytz
import sys
import json
import uuid
import time
from random import sample, randint, choice, random, shuffle
from pyxform.xls2json import parse_file_to_json
from pyxform.xls2xform import xls2xform_convert
from pyxform.constants import (
    SELECT_ALL_THAT_APPLY,
    SELECT_ONE,
    RANK,
    ID_STRING,
    VERSION,
    NAME,
    CHILDREN,
    TYPE,
    SURVEY,
    CONTROL,
    APPEARANCE,
)
from xmltodict import unparse

from faker import Faker

TEXT = "text"

base_dir = os.path.dirname(os.path.abspath(__file__))

xml_dir = os.path.join(base_dir, "public")

faker = Faker()

TIME_ZONE = "Asia/Kolkata"


def get_uuid():
    return str(uuid.uuid4())


def get_instance_id(_uuid):
    return f"uuid:{_uuid}"


def format_openrosa_datetime(dt=None, tz=pytz.timezone(TIME_ZONE)):
    dt = dt or datetime.datetime.now(tz=tz)
    if isinstance(dt, datetime.datetime):
        # datetime in ISO 8601 format :YYYY-MM-DD(T)HH:MM:SS.mmm+HH:MM
        return dt.isoformat("T", "milliseconds")
    elif isinstance(dt, datetime.time):
        # time in ISO 8601 format :HH:MM:SS.mmm+HH:MM
        return (
            tz.localize(
                datetime.datetime.combine(
                    datetime.date.today(),
                    dt,
                )
            )
            .isoformat("T", "milliseconds")
            .split("T")[-1]
        )
    elif isinstance(dt, datetime.date):
        # date in ISO 8601 format :YYYY-MM-DD
        return dt.isoformat()
    return str(dt)


def get_point():
    def _get_item(s=0, e=1, r=6):
        return round(randint(s, e) * random(), r)

    lat, lon = faker.local_latlng(country_code="IN", coords_only=True)
    return f"{lat} {lon} {_get_item(0,10, 1)} {_get_item(0,10, 1)}"


def get_random_datetime(_type="datetime"):
    dt = faker.date_time_between(
        start_date="-5y", end_date="now", tzinfo=pytz.timezone(TIME_ZONE)
    )
    if _type == "dateTime":
        return format_openrosa_datetime(dt)
    if _type == "time":
        return format_openrosa_datetime(dt.time())
    if _type == "date":
        return format_openrosa_datetime(dt.date())


start_time = format_openrosa_datetime()


def get_data(survey):
    result = {}
    for item in survey:
        name = item.get(NAME)
        if name is None:
            continue

        data_type = item.get("type")
        appearance = item.get(CONTROL, {}).get(APPEARANCE)

        res = item.get("default", "")
        # SELECT QUESTIONS
        if data_type in [SELECT_ALL_THAT_APPLY, SELECT_ONE, RANK]:
            choices = item.get("choices")
            if choices is None:
                continue
            _choices = [c[NAME] for c in choices]

            if data_type == SELECT_ALL_THAT_APPLY:
                res = " ".join(sample(_choices, randint(0, len(_choices))))
            elif data_type == SELECT_ONE:
                res = choice(_choices)
            elif data_type == RANK:
                shuffle(_choices)
                res = " ".join(_choices)

        # TEXT
        elif data_type == TEXT:
            if appearance == "multiline":
                res = faker.sentence(nb_words=3)
            elif appearance == "numbers":
                res = faker.msisdn()
            elif appearance == "url":
                res = faker.url()
            else:
                res = faker.word()

        # DATE AND TIME
        elif data_type in ["dateTime", "date", "time"]:
            res = get_random_datetime(data_type)

        # META
        elif data_type == "start":
            res = start_time
        elif data_type in "end":
            res = format_openrosa_datetime()
        elif data_type == "today":
            res = format_openrosa_datetime(datetime.datetime.now().date())

        # NUMBER QUESTIONS
        elif data_type in "integer":
            res = faker.pyint(max_value=randint(9999, 9999999))
        elif data_type == "decimal":
            res = faker.pydecimal(
                left_digits=randint(1, 5),
                right_digits=randint(1, 5),
                positive=True,
            )

        # RANGE QUESTIONS
        elif data_type == "range":
            parameters = item.get("parameters", {})
            res = faker.random_int(
                min=int(float(parameters.get("start", 0))),
                max=int(float(parameters.get("end", 99999))),
            )

        # GEO QUESTIONS
        elif data_type == "geopoint":
            res = get_point()
        elif data_type == "geotrace":
            res = ";".join([get_point(), get_point()])
        elif data_type == "geoshape":
            p1 = get_point()
            res = ";".join(
                [p1] + [get_point() for _ in range(1, randint(4, 10))] + [p1]
            )

        # GROUP
        elif data_type == "group":
            res = get_data(item[CHILDREN])

        result[name] = res
    return result


def get_submission_data(asset_content):
    if asset_content.get(TYPE) == SURVEY:
        survey = asset_content["children"]
        result = get_data(survey)
        return result
    raise ValueError("Invalid asset type")


def prepare_submission(asset):
    _uuid = get_uuid()

    data = {}

    data.update(get_submission_data(asset))
    data.update(
        {
            "meta": {
                "instanceID": get_instance_id(_uuid),
            },
            "@id": asset.get(ID_STRING),
            "@version": asset.get(VERSION),
            # NAMESPACES
            "@xmlns:jr": "http://openrosa.org/javarosa",
            "@xmlns:orx": "http://openrosa.org/xforms",
        }
    )
    xml = unparse(
        {
            asset.get(NAME): data,
        },
        pretty=True,
    )
    return xml, _uuid


def main(asset, count=1, asset_folder=None):

    mock_start = time.time()

    res_codes = []
    for i in range(count):
        xml, _uuid = prepare_submission(asset)
        res_codes.append(_uuid)
        if asset_folder:
            with open(
                os.path.join(
                    asset_folder,
                    f"mock-{_uuid}.xml",
                ),
                "w+",
            ) as f:
                f.write(xml)
    mock_end = time.time()
    mock_time = mock_end - mock_start
    print(
        f"[{mock_time:.2f}s] Total {len(res_codes)} Data generated.",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="A CLI tool to submit random data to KoBo"
    )
    parser.add_argument(
        "--count",
        "-c",
        type=int,
        default=1,
        help="Number of submissions to generate",
    )
    parser.add_argument(
        "--delete",
        "-d",
        default=False,
        help="Clear the existing data",
        action="store_true",
    )
    # add one positional argument
    parser.add_argument(
        "path",
        type=str,
        help="Path to the asset file",
    )

    args = parser.parse_args()

    # check if path exists and is a file
    if not os.path.isfile(args.path):
        print(f"Error: {args.path} is not a file")
        sys.exit(1)
    args.path = os.path.abspath(args.path)

    if not os.path.exists(xml_dir):
        os.makedirs(xml_dir)

    try:
        # handle XML Generation
        start_xml = time.time()
        filename_ = os.path.basename(args.path)
        filename, _ = os.path.splitext(filename_)

        asset_folder = os.path.join(xml_dir, filename)
        if not os.path.exists(asset_folder):
            os.makedirs(asset_folder)
        else:
            if args.delete:
                for file in os.listdir(asset_folder):
                    file_path = os.path.join(asset_folder, file)
                    if os.path.isfile(file_path):
                        os.unlink(file_path)

        output_path = os.path.join(asset_folder, "asset.xml")
        print("Converting...'%s' to XForm" % (filename))
        response = {"code": None, "message": None, "warnings": []}

        try:
            response["warnings"] = xls2xform_convert(
                xlsform_path=args.path,
                xform_path=output_path,
                validate=True,
                pretty_print=True,
                # enketo=True,
            )
            end_xml = time.time()

            response["code"] = 100
            response["message"] = f"[{end_xml - start_xml:.2f}s] Ok!"

            if response["warnings"]:
                response["code"] = 101
                response["message"] = "Ok with warnings."

        except Exception as e:
            # Catch the exception by default.
            response["code"] = 999
            response["message"] = "%s: %s" % (type(e).__name__, str(e))

        print(response["message"])

        asset = parse_file_to_json(args.path)
        json.dump(
            asset,
            open(os.path.join(asset_folder, "asset.json"), "w+"),
            indent=4,
        )
    except Exception as e:
        print(f"Error: {e}")
        raise e

    print(f"Generating {args.count} submissions for '{filename}'")

    main(
        asset,
        count=args.count,
        asset_folder=asset_folder,
    )
