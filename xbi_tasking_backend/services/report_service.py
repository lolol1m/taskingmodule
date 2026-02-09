import os
import dateutil.parser
from datetime import timedelta


def _get_limit_offset(payload):
    limit = payload.get("Limit")
    offset = payload.get("Offset", 0)
    if limit is None:
        limit = int(os.getenv("MAX_QUERY_LIMIT", "1000"))
    try:
        limit = int(limit) if limit is not None else None
    except (TypeError, ValueError):
        limit = int(os.getenv("MAX_QUERY_LIMIT", "1000"))
    try:
        offset = int(offset) if offset is not None else 0
    except (TypeError, ValueError):
        offset = 0
    if limit is not None and limit <= 0:
        limit = None
    if offset < 0:
        offset = 0
    return limit, offset


def _validate_date_range(start_dt, end_dt):
    max_days = int(os.getenv("MAX_DATE_RANGE_DAYS", "90"))
    if end_dt < start_dt:
        raise ValueError("End Date must be after Start Date")
    if (end_dt - start_dt).days > max_days:
        raise ValueError(f"Date range cannot exceed {max_days} days")


class ReportService:
    def __init__(self, report_queries, lookup_queries, excel_generator):
        self.reports = report_queries
        self.lookup = lookup_queries
        self.eg = excel_generator

    def get_xbi_report(self, start_date, end_date, limit=None, offset=None):
        start_dt = dateutil.parser.isoparse(start_date)
        end_dt = dateutil.parser.isoparse(end_date) + timedelta(days=1)
        _validate_date_range(start_dt, end_dt)
        image_datas = self.reports.getXBIReportImage(
            start_dt.strftime("%Y-%m-%d"),
            end_dt.strftime("%Y-%m-%d"),
            limit=limit,
            offset=offset,
        )
        exploitable_images = {}
        unexploitable_images = {}
        for cat in self.lookup.getCategories():
            exploitable_images[cat[0]] = 0
            unexploitable_images[cat[0]] = [0,0,0,0]

        for image in image_datas:
            if image[2] == None:
                continue
            elif image[2] == "Img Error":
                unexploitable_images[image[1]][0] += 1
            elif image[2] == "Failed":
                unexploitable_images[image[1]][1] += 1
            elif image[2] == "I-IIRS 0":
                unexploitable_images[image[1]][2] += 1
            elif image[2] == "TOS":
                unexploitable_images[image[1]][3] += 1
            else:
                exploitable_images[image[1]] += 1
        return exploitable_images, unexploitable_images

    def get_xbi_report_data(self, payload):
        limit, offset = _get_limit_offset(payload)
        exploitable, unexploitable = self.get_xbi_report(
            payload["Start Date"],
            payload["End Date"],
            limit=limit,
            offset=offset,
        )
        exploitable.pop("UNCATEGORISED", None)
        unexploitable.pop("UNCATEGORISED", None)
        output = {}
        output["Category"] = list(exploitable.keys())
        output["Exploitable"] = []
        output["Unexploitable"] = []
        output["Remarks"] = ""
        remarks = ["Img Error", "Failed", "100C", "TOS"]
        for category in output["Category"]:
            output["Exploitable"].append(exploitable[category])
            output["Unexploitable"].append(sum(unexploitable[category]))
            if sum(unexploitable[category]) == 0:
                continue
            output["Remarks"] += category + "\n"
            for j in range(len(remarks)):
                if unexploitable[category][j] != 0:
                    output["Remarks"] += remarks[j] + " - " + str(unexploitable[category][j]) + "\n"
        return output

    def get_xbi_report_data_for_excel(self, payload):
        limit, offset = _get_limit_offset(payload)
        exploitable, unexploitable = self.get_xbi_report(
            payload["Start Date"],
            payload["End Date"],
            limit=limit,
            offset=offset,
        )
        exploitable.pop("UNCATEGORISED", None)
        unexploitable.pop("UNCATEGORISED", None)
        output = {}
        output["Tasking"] = ["Coverage", "Total"]
        remarks = ["Img Error", "Failed", "100C", "TOS"]
        remarks_temp = ""
        for category in list(exploitable.keys()):
            output["Exploitable " + category] = [exploitable[category], exploitable[category]]
        for category in list(exploitable.keys()):
            output["Unexploitable " + category] = [sum(unexploitable[category]), sum(unexploitable[category])]
            if sum(unexploitable[category]) == 0:
                continue
            remarks_temp += category + "\n"
            for j in range(len(remarks)):
                if unexploitable[category][j] != 0:
                    remarks_temp += remarks[j] + " - " + str(unexploitable[category][j]) + "\n"
        output["Remarks"] = [remarks_temp, ""]
        return self.eg.create_excel(output)
