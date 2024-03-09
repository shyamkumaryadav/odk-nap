import os
import time
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from xlrd import FILE_FORMAT_DESCRIPTIONS

from pyxform.xls2xform import xls2xform_convert

base_dir = os.path.dirname(os.path.abspath(__file__))

xls_dir = os.path.join(base_dir, "XLS")

xml_dir = os.path.join(base_dir, "public")

supported_excel_ext = FILE_FORMAT_DESCRIPTIONS.keys()


class MyHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if os.path.splitext(event.src_path)[1][1:] in supported_excel_ext:
            subprocess.call(["clear"])
            filename_ = os.path.basename(event.src_path)
            filename, _ = os.path.splitext(filename_)

            output_path = os.path.join(xml_dir, filename + ".xml")
            print("Converting...'%s' to XForm" % (filename))
            response = {"code": None, "message": None, "warnings": []}

            try:
                response["warnings"] = xls2xform_convert(
                    xlsform_path=event.src_path,
                    xform_path=output_path,
                    validate=True,
                    pretty_print=True,
                    # enketo=True,
                )

                response["code"] = 100
                response["message"] = "Ok!"

                if response["warnings"]:
                    response["code"] = 101
                    response["message"] = "Ok with warnings."

            except Exception as e:
                # Catch the exception by default.
                response["code"] = 999
                response["message"] = "%s: %s" % (type(e).__name__, str(e))

            print(response["message"])
            if response["code"] != 999:
                if os.name == "nt":
                    import winsound

                    winsound.MessageBeep(type=winsound.MB_OK)
            # get all xml files in xml_dir
            xml_files = [
                (response["message"] if response["code"] == 999 else "") + f
                for f in os.listdir(xml_dir)
                if os.path.isfile(os.path.join(xml_dir, f))
                and os.path.splitext(f)[1] == ".xml"
            ]
            # create a json file which contains all xml files
            with open(os.path.join(xml_dir, "forms.json"), "w") as f:
                f.write('{"forms": [')
                f.write(",".join(['"%s"' % (x) for x in xml_files]))
                f.write("]}")


if __name__ == "__main__":
    event_handler = MyHandler()
    if not os.path.exists(xls_dir):
        os.makedirs(xls_dir)
    if not os.path.exists(xml_dir):
        os.makedirs(xml_dir)
    observer = Observer()
    observer.schedule(
        event_handler,
        path=xls_dir,
        recursive=True,
    )
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        observer.join()
    finally:
        print("Exiting...")
