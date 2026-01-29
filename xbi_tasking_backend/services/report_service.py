import dateutil.parser
from datetime import timedelta


class ReportService:
    def __init__(self, query_manager, excel_generator):
        self.qm = query_manager
        self.eg = excel_generator

    def get_xbi_report(self, start_date, end_date):
        image_datas = self.qm.getXBIReportImage(
            dateutil.parser.isoparse(start_date).strftime(f"%Y-%m-%d"), 
            (dateutil.parser.isoparse(end_date) + timedelta(days=1)).strftime(f"%Y-%m-%d")
        )
        exploitable_images = {}
        unexploitable_images = {}
        for cat in self.qm.getCategories():
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
        exploitable, unexploitable = self.get_xbi_report(payload['Start Date'], payload['End Date'])
        exploitable.pop("UNCATEGORISED", None)
        unexploitable.pop("UNCATEGORISED", None)
        output = {}
        output["Category"] = list(exploitable.keys())
        output["Exploitable"] = []
        output["Unexploitable"] = []
        output["Remarks"] = ""
        remarks = ["Img Error", "Failed", "100C", "TOS"]
        for i in output["Category"]:
            output["Exploitable"].append(exploitable[i])
            output["Unexploitable"].append(sum(unexploitable[i]))
            if sum(unexploitable[i]) == 0:
                continue
            output["Remarks"] += i + "\n"
            for j in range(len(remarks)):
                if unexploitable[i][j] != 0:
                    output["Remarks"] += remarks[j] + " - " + str(unexploitable[i][j]) + "\n"
        return output

    def get_xbi_report_data_for_excel(self, payload):
        exploitable, unexploitable = self.get_xbi_report(payload['Start Date'], payload['End Date'])
        exploitable.pop("UNCATEGORISED", None)
        unexploitable.pop("UNCATEGORISED", None)
        output = {}
        output["Tasking"] = ["Coverage", "Total"]
        remarks = ["Img Error", "Failed", "100C", "TOS"]
        remarks_temp = ""
        for i in list(exploitable.keys()):
            output["Exploitable "+i] = [exploitable[i], exploitable[i]]
        for i in list(exploitable.keys()):
            output["Unexploitable "+i] = [sum(unexploitable[i]), sum(unexploitable[i])]
            if sum(unexploitable[i]) == 0:
                continue
            remarks_temp += i + "\n"
            for j in range(len(remarks)):
                if unexploitable[i][j] != 0:
                    remarks_temp += remarks[j] + " - " + str(unexploitable[i][j]) + "\n"
        output["Remarks"] = [remarks_temp,""]
        return self.eg.create_excel(output)
