import logging
import os

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse

from api_utils import error_response, model_to_dict, run_blocking
from schemas import DateRangePayload, KeyValueMapResponse
from security import get_current_user


router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger("xbi_tasking_backend.reports")


@router.post("/getXBIReportData")
async def get_xbi_report_data(request: Request, payload: DateRangePayload, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
    '''
    Function: gets the XBI report data to display on UI

    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-05T16:00:00.000Z'
        }

    Output:
    
        {
            'Category': [<string>, <string>, <string>, <string>], 
            'Exploitable': [<int>, <int>, <int>, <int>], 
            'Unexploitable': [<int>, <int>, <int>, <int>], 
            'Remarks': <string>
        }
    
    Sample:
        
        {
            'Category': ['UAV', 'AB', 'HB', 'AVIS'], 
            'Exploitable': [1, 1, 0, 0], 
            'Unexploitable': [2, 0, 0, 0], 
            'Remarks': 'UAV\nImg Error - 1\nFailed - 1\n'
        }
        
    '''
    try:
        return await run_blocking(request.app.state.report_service.get_xbi_report_data, model_to_dict(payload))
    except Exception:
        logger.exception("getXBIReportData failed")
        return error_response(500, "Failed to get report data", "get_report_failed")


@router.post("/getXBIReportDataForExcel")
async def get_xbi_report_data_for_excel(request: Request, payload: DateRangePayload, user: dict = Depends(get_current_user)):
    '''
    Function: gets the XBI report data to display on UI

    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-05T16:00:00.000Z'
        }
    '''
    try:
        excel_file_path = await run_blocking(request.app.state.report_service.get_xbi_report_data_for_excel, model_to_dict(payload))
        return FileResponse(path=excel_file_path, filename=os.path.basename(excel_file_path))
    except Exception:
        logger.exception("getXBIReportDataForExcel failed")
        return error_response(500, "Failed to generate Excel report", "get_report_excel_failed")
