import os

from xlrd import FILE_FORMAT_DESCRIPTIONS

TEXT = "text"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

XLS_DIR = os.path.join(BASE_DIR, "XLS")

ASSETS_DIR = os.path.join(BASE_DIR, "public")

SUPPORTED_EXCEL_EXT = FILE_FORMAT_DESCRIPTIONS.keys()

TIME_ZONE = "Asia/Kolkata"
