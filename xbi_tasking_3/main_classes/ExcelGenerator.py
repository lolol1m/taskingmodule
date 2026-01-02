import pandas as pd
import os
import datetime
import time
import json 
from datetime import date as date
from datetime import datetime ,timedelta
from time import strptime
from calendar import monthrange
import xlsxwriter

class ExcelGenerator:
    def __init__(self):
        #edit excel destination here
        self.excel_destination = os.curdir
        self.sheet_name = "Report"

    def create_excel(self, json):
        '''
        Function: Writes an Excel File
        '''
        excel_destination = os.path.join(self.excel_destination, "report.xlsx")
        writer = pd.ExcelWriter(excel_destination, engine = 'xlsxwriter') 

        df = self.create_sheet(json)
        df.style.to_excel(writer,sheet_name = self.sheet_name,index = False)
        writer = self.organise_column_length(df,writer) 
        writer.close()
        return excel_destination

    def create_sheet(self, json):
        '''
        Function: Function that creates the df sheet
        Output: returns a DF with required data
        '''
        df = pd.DataFrame(json)   
        return df

    def organise_column_length(self,df,writer):
        '''
        Function: reformats the columns to look nice
        Input: df with all the columns
        Input: writer is a writer object in pandas
        '''
        workbook = writer.book
        text_wrap_format = workbook.add_format({'text_wrap':True, 'align':'center', 'valign':'center'})
        for column in df: 
            if df.empty:
                col_idx = df.columns.get_loc(column)
                writer.sheets[self.sheet_name].set_column(col_idx , col_idx, len(column) + 4, text_wrap_format)
            else:
                column_width = max(df[column].astype(str).map(len).max(), len(column))
                col_idx = df.columns.get_loc(column)
                writer.sheets[self.sheet_name].set_column(col_idx , col_idx, column_width + 8, text_wrap_format)
        return writer
