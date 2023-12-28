import os
import time
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from xlrd import FILE_FORMAT_DESCRIPTIONS

base_dir = os.path.dirname(os.path.abspath(__file__))

xls_dir = os.path.join(base_dir, "ODK Format")

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
            out = subprocess.call(
                [
                    "xls2xform",
                    "--pretty_print",
                    # "--skip_validate",
                    # "--odk_validate",
                    # "--enketo_validate",
                    event.src_path,
                    output_path,
                ]
            )
            # get all xml files in xml_dir
            xml_files = [
                ("(Error) " if out != 0 else "") + f
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
