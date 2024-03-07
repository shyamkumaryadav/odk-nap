#!/usr/bin/env python3

import argparse
import datetime
import os
import pytz
import sys
import uuid
from copy import copy
from dateutil.parser import parse as date_parse
from random import sample, randint, choice, random, shuffle
from xml.etree import ElementTree as ET

import lorem

from pyxform.xls2json_backends import xls_to_dict
from dicttoxml import dicttoxml

from faker import Faker


faker = Faker()


def get_uuid():
    return str(uuid.uuid4())


def get_instance_id(_uuid):
    return f"uuid:{_uuid}"


def get_version_id(deployment_data):
    return deployment_data["results"][0]["uid"]


def get_version_string(deployment_data):
    count = deployment_data["count"]
    date_obj = date_parse(deployment_data["results"][0]["date_deployed"])
    date_str = date_obj.strftime("%Y-%m-%d %H:%M:%S")
    return f"{count} ({date_str})"


def format_openrosa_datetime(dt=None):
    dt = dt or datetime.datetime.now(tz=pytz.UTC)
    if isinstance(dt, datetime.datetime):
        return dt.isoformat("T", "milliseconds")
    elif isinstance(dt, datetime.time):
        return dt.isoformat("milliseconds")
    elif isinstance(dt, datetime.date):
        return dt.isoformat()
    return str(dt)


def get_point():
    def _get_item(s=0, e=1, r=6):
        return round(randint(s, e) * random(), r)

    lat = _get_item(-90, 90)
    lon = _get_item(-180, 180)
    return f"{lat} {lon} {_get_item(0,10, 1)} {_get_item(0,10, 1)}"


def get_random_datetime(_type="datetime"):
    dt = faker.date_time_between(start_date="-30y", end_date="now")
    dt = dt.astimezone(pytz.timezone(choice(pytz.all_timezones)))
    if _type == "datetime":
        return format_openrosa_datetime(dt)
    if _type == "time":
        return format_openrosa_datetime(dt.time())
    if _type == "date":
        return format_openrosa_datetime(dt.date())


def get_asset_details(asset):
    return {
        "asset_uid": asset["uid"],
        "version": get_version_string(asset["deployed_versions"]),
    }


def get_submission_misc(_uuid, deployment_data):
    return {
        "formhub": {"uuid": _uuid},
        "__version__": get_version_id(deployment_data),
        "meta": {"instanceID": get_instance_id(_uuid)},
    }


def get_submission_data(asset_content):
    survey = asset_content["survey"]
    asset_choices = asset_content.get("choices", [])
    survey_choices = {}
    for item in asset_choices:
        ln = item["list_name"]
        n = item["name"]
        if ln not in survey_choices:
            survey_choices[ln] = [n]
        else:
            survey_choices[ln].append(n)

    result = {}
    for item in survey:
        name = item.get("name") or item.get("$autoname")
        if name is None:
            continue

        data_type = item.get("type")
        appearance = item.get("appearance")
        current_time = format_openrosa_datetime()

        choices = None
        if data_type in ["select_one", "select_multiple"]:
            choices = survey_choices[item["select_from_list_name"]]

        res = ""
        # SELECT QUESTIONS
        if data_type == "select_multiple":
            res = " ".join(sample(choices, randint(0, len(choices))))
        elif data_type == "select_one":
            res = choice(choices)
        elif data_type == "rank":
            _choices = copy(choices)
            shuffle(_choices)
            res = " ".join(_choices)

        # TEXT
        elif data_type == "text":
            if appearance == "multiline":
                res = lorem.get_sentence(count=randint(1, 20))
            else:
                res = lorem.get_word(count=randint(1, 5))

        # DATE AND TIME
        elif data_type in ["datetime", "date", "time"]:
            res = get_random_datetime(data_type)

        # META
        elif data_type in ["start", "end"]:
            res = current_time

        # NUMBER QUESTIONS
        elif data_type in ["integer", "range"]:
            res = randint(0, 99999)
        elif data_type == "decimal":
            res = round(random() * randint(0, 99999), randint(1, 10))

        # GEO QUESTIONS
        elif data_type == "geopoint":
            res = get_point()
        elif data_type == "geotrace":
            res = ";".join([get_point(), get_point()])
        elif data_type == "geoshape":
            p1 = get_point()
            res = ";".join(
                [p1] + [get_point() for _ in range(1, randint(2, 10))] + [p1]
            )

        result[name] = res

    return result


def get_submission(_uuid, asset):
    return {
        **get_submission_misc(_uuid, asset["deployed_versions"]),
        **get_submission_data(asset["content"]),
    }


def prepare_submission(asset):
    _uuid = get_uuid()

    asset_details = get_asset_details(asset)
    data = get_submission(_uuid, asset)

    xml = ET.fromstring(dicttoxml(data, attr_type=False))
    xml.tag = asset_details["asset_uid"]
    xml.attrib = {
        "id": asset_details["asset_uid"],
        "version": asset_details["version"],
    }

    return ET.tostring(xml), _uuid


def main(asset, count=1):
    asset = {}  # in JSON
    res_codes = []
    for _ in range(count):
        xml, _uuid = prepare_submission(asset)
        # file_tuple = (_uuid, io.BytesIO(xml))
        res_codes.append(_uuid)

    print(f"{len(res_codes)} total Data generated.")


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

    try:
        asset = xls_to_dict(args.path)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    print(f"Generating {args.count} submissions for {args.path}")

    print(asset)

    main(asset, count=args.count)
