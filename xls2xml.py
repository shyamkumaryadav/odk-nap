import os
import time
import logging

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from conf import XLS_DIR, SUPPORTED_EXCEL_EXT
from utils import xls2xml, json_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

logger = logging.getLogger(__name__)


class MyHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if (
            not event.is_directory
            and os.path.splitext(event.src_path)[1][1:].lower() in SUPPORTED_EXCEL_EXT
            and not os.path.basename(event.src_path).startswith("~$")
        ):
            try:
                response = xls2xml(event.src_path)

                logger.info(response["message"])
                for warning in response["warnings"]:
                    logger.warning(f"Warning: {warning}")

                if response["code"] != 999:
                    json_file()
                    if os.name == "nt":
                        import winsound

                        winsound.MessageBeep(type=winsound.MB_OK)
            except Exception as e:
                logger.error(f"Error: {e}")


if __name__ == "__main__":
    logger.info("Starting...")
    event_handler = MyHandler()

    observer = Observer()

    observer.schedule(event_handler, path=XLS_DIR, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        observer.join()
    finally:
        logger.info("Exiting...")
