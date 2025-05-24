import os
import json
import httpx
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

# Arguments schema for the report tool
tool_dir = os.path.dirname(__file__)
static_dir = os.path.join(tool_dir, '..', 'static')
report_dir = os.path.join(static_dir, 'reports')

class ReportArgs(BaseModel):
  start: str = Field(..., description="Start date (YYYY-MM-DD)")
  end: str = Field(..., description="End date (YYYY-MM-DD)")
  fmt: str = Field('pdf', description="Format of report, default 'pdf'")


def render_pdf(data: dict, start: str, end: str) -> str:
  # Ensure report directory exists
  os.makedirs(report_dir, exist_ok=True)
  filename = f"report_{start}_to_{end}.pdf"
  file_path = os.path.join(report_dir, filename)

  # Simple PDF generation using ReportLab
  from reportlab.lib.pagesizes import letter
  from reportlab.pdfgen import canvas
  from reportlab.lib.units import inch

  c = canvas.Canvas(file_path, pagesize=letter)
  width, height = letter
  c.setFont("Helvetica-Bold", 14)
  c.drawString(1*inch, height - 1*inch, f"Scheduling Report: {start} to {end}")

  # KPI summary
  c.setFont("Helvetica", 12)
  c.drawString(1*inch, height - 1.3*inch, f"Total Hours: {data.get('totalHours', 0)}")

  # List assignments by project
  y = height - 1.6*inch
  c.setFont("Helvetica-Bold", 12)
  c.drawString(1*inch, y, "Assignments by Project:")
  c.setFont("Helvetica", 10)
  y -= 0.2*inch
  for proj in data.get('assignmentsByProject', []):
    c.drawString(1.2*inch, y, f"- {proj['projectName']}: {proj['hours']}h ({proj['count']} entries)")
    y -= 0.2*inch
    if y < 1*inch:
      c.showPage()
      y = height - 1*inch

  # New page: by staff
  c.showPage()
  y = height - 1*inch
  c.setFont("Helvetica-Bold", 12)
  c.drawString(1*inch, y, "Assignments by Staff:")
  c.setFont("Helvetica", 10)
  y -= 0.2*inch
  for staff in data.get('assignmentsByStaff', []):
    c.drawString(1.2*inch, y, f"- {staff['staffName']}: {staff['hours']}h")
    y -= 0.2*inch
    if y < 1*inch:
      c.showPage()
      y = height - 1*inch

  c.save()
  return file_path

class ReportTool(BaseTool):
  """Tool to generate a PDF scheduling report for a given date range"""
  name: str = "generate_report"
  args_schema = ReportArgs

  def _run(self, start: str, end: str, fmt: str = 'pdf') -> dict:
    # Fetch summary data
    resp = httpx.get(f"http://localhost:5001/api/analytics/range?from={start}&to={end}")
    resp.raise_for_status()
    data = resp.json()
    # Generate PDF
    pdf_path = render_pdf(data, start, end)
    return {"url": f"/static/reports/{os.path.basename(pdf_path)}"} 