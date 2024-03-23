import argparse
import sys
import json
import os
import time

from pyxform.xls2json import parse_file_to_json

from conf import ASSETS_DIR
from utils import xls2xml, generate_mock_response

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

    if not os.path.exists(ASSETS_DIR):
        os.makedirs(ASSETS_DIR)

    try:
        start_xml = time.time()
        filename_ = os.path.basename(args.path)
        filename, _ = os.path.splitext(filename_)

        asset_folder = os.path.join(ASSETS_DIR, filename)
        if not os.path.exists(asset_folder):
            os.makedirs(asset_folder)
        else:
            if args.delete:
                for file in os.listdir(asset_folder):
                    file_path = os.path.join(asset_folder, file)
                    if os.path.isfile(file_path):
                        os.unlink(file_path)

        response = xls2xml(args.path)

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

    generate_mock_response(
        asset,
        count=args.count,
        asset_folder=asset_folder,
    )
