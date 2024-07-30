#!/usr/bin/env python3

import datetime
import os
import pytz
import uuid
import time
import tempfile
import shutil
import subprocess
import json

from random import sample, randint, choice, random, shuffle

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

from conf import ASSETS_DIR, SUPPORTED_EXCEL_EXT, TIME_ZONE, TEXT, ASSET_FILE

faker = Faker()


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
        data_type = item.get("type")
        appearance = item.get(CONTROL, {}).get(APPEARANCE)
        res = item.get("default", "")

        if name is None or data_type == "repeat":
            continue

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

        result[name] = item.get("default", res)
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


def generate_mock_response(asset, count=1, asset_folder=None):

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


def xls2xml(xls_path):
    if (
        xls_path
        and os.path.exists(xls_path)
        and os.path.splitext(xls_path)[1][1:] in SUPPORTED_EXCEL_EXT
    ):
        temp_dir = tempfile.mkdtemp()
        filename_ = os.path.basename(xls_path)
        filename, _ = os.path.splitext(filename_)
        xls_form_path = os.path.join(temp_dir, filename)
        shutil.copy(xls_path, xls_form_path)
        start_xml = time.time()

        asset_folder = os.path.join(ASSETS_DIR, filename)
        if not os.path.exists(asset_folder):
            os.makedirs(asset_folder)

        output_path = os.path.join(asset_folder, ASSET_FILE)
        print("Converting...'%s' to XForm" % (filename))
        response = {"code": None, "message": None, "warnings": []}

        out = subprocess.call(
            [
                "xls2xform",
                "--pretty_print",
                # "--skip_validate",
                # "--odk_validate",
                # "--enketo_validate",
                xls_path,
                output_path,
            ],
        )

        end_xml = time.time()
        response["message"] = f"[{end_xml - start_xml:.1f}s] "
        if out == 0:
            response["code"] = 100
            response["message"] += "Ok!"

            if response["warnings"]:
                response["code"] = 101
                response["message"] += "Ok with warnings."
        else:
            response["code"] = 999
            response["message"] += "Error!"

    return response


def json_file():
    xml_files = []
    for filename in os.listdir(ASSETS_DIR):
        xml_file = os.path.join(ASSETS_DIR, filename, ASSET_FILE)
        if os.path.isfile(xml_file):
            xml_files.append(
                {
                    "title": filename,
                    "path": f"{filename}/{ASSET_FILE}",
                }
            )
    json_file = os.path.join(ASSETS_DIR, "forms.json")
    with open(json_file, "w") as f:
        json.dump(xml_files, f)
