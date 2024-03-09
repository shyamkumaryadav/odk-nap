#!/usr/bin/env python3

import argparse
import datetime
import os
import pytz
import sys
import json
import uuid
from random import sample, randint, choice, random, shuffle
from pyxform.xls2json import parse_file_to_json
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


faker = Faker()


def get_uuid():
    return str(uuid.uuid4())


def get_instance_id(_uuid):
    return f"uuid:{_uuid}"


def format_openrosa_datetime(dt=None):
    # 02:24:00.000+05:30, 14:24:00.000+05:30 if it's time
    # 2024-03-09T02:27:00+05:30 if it's datetime
    dt = dt or datetime.datetime.now(tz=pytz.UTC)
    if isinstance(dt, datetime.datetime):
        return dt.isoformat("T", "milliseconds")
    elif isinstance(dt, datetime.time):
        return dt.isoformat()
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
    dt = faker.date_time_between(start_date="-5y", end_date="now")
    dt = dt.astimezone(pytz.timezone(faker.random_element(pytz.all_timezones)))
    if _type == "datetime":
        return format_openrosa_datetime(dt)
    if _type == "time":
        return faker.time(pattern="%H:%M:%S.%f%z")
    if _type == "date":
        return faker.date()


def get_data(survey):
    result = {}
    for item in survey:
        name = item.get(NAME) or item.get("$autoname")
        if name is None:
            continue

        data_type = item.get("type")
        appearance = item.get(CONTROL, {}).get(APPEARANCE)
        current_time = format_openrosa_datetime()

        res = item.get("default", "")
        # SELECT QUESTIONS
        # select one, select all that apply, rank
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
    # xmlns:jr="http://openrosa.org/javarosa"
    # xmlns:orx="http://openrosa.org/xforms"
    # id="all-question-types"
    # version="2024022901"
    xml = unparse(
        {
            asset.get(NAME): data,
        },
        pretty=True,
    )
    return xml, _uuid


def main(asset, count=1, filename=None):
    res_codes = []
    for i in range(count):
        xml, _uuid = prepare_submission(asset)
        res_codes.append(_uuid)
        if filename:
            if not os.path.exists(f"public/{filename}"):
                os.makedirs(f"public/{filename}")
            with open(f"public/{filename}/{i}.xml", "w+") as f:
                f.write(xml)
    json.dump(
        asset,
        open(f"public/{filename}.json", "w+"),
        indent=4,
    )
    print(f"{res_codes} total Data generated.")


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
        asset = parse_file_to_json(args.path)
    except Exception as e:
        print(f"Error: {e}")
        raise e
    print(f"Generating {args.count} submissions for {args.path}")

    main(
        asset,
        count=args.count,
        filename=os.path.basename(args.path).split(".")[0],
    )
