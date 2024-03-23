import os
import time

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from conf import XLS_DIR, SUPPORTED_EXCEL_EXT
from utils import xls2xml


class MyHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if os.path.splitext(event.src_path)[1][
            1:
        ] in SUPPORTED_EXCEL_EXT and not event.src_path.startswith("~$"):
            try:
                response = xls2xml(event.src_path)

                print(response["message"])

                if response["code"] != 999:
                    if os.name == "nt":
                        import winsound

                        winsound.MessageBeep(type=winsound.MB_OK)
            except Exception as e:
                print("Error: ", e)

                # # get all xml files in xml_dir
                # xml_files = [
                #     (response["message"] if response["code"] == 999 else "")
                #  + f
                #     for f in os.listdir(xml_dir)
                #     if os.path.isfile(os.path.join(xml_dir, f))
                #     and os.path.splitext(f)[1] == ".xml"
                # ]
                # # create a json file which contains all xml files
                # with open(os.path.join(xml_dir, "forms.json"), "w") as f:
                #     f.write('{"forms": [')
                #     f.write(",".join(['"%s"' % (x) for x in xml_files]))
                #     f.write("]}")


if __name__ == "__main__":
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
        print("Exiting...")
