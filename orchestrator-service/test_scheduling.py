import asyncio
import httpx
import json
import re

async def test_scheduling():
    try:
        # Test API connection
        url = 'http://localhost:5001/api/staff'
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            print(f'Staff API status: {resp.status_code}')
            
            if resp.status_code == 200:
                staff_data = resp.json()
                print(f'Found {len(staff_data)} staff members')
                
                # Test scheduling command parsing
                query = 'can you book 8 hrs for Merrin for Youssef Sharma on 21st May ?'
                
                # Extract hours
                hours_match = re.search(r'(\d+)\s*(?:hrs?|hours?)', query, re.IGNORECASE)
                hours = int(hours_match.group(1)) if hours_match else 8
                
                # Extract date  
                date = '2025-05-21'  # 21st May
                
                # Find Youssef Sharma
                staff_member = None
                for staff in staff_data:
                    if 'youssef sharma' in staff['name'].lower():
                        staff_member = staff
                        break
                
                if staff_member:
                    print(f'Found staff: {staff_member["name"]}')
                    
                    # Get projects to find Merrin
                    projects_resp = await client.get('http://localhost:5001/api/projects')
                    if projects_resp.status_code == 200:
                        projects = projects_resp.json()
                        merrin_project = None
                        for project in projects:
                            if 'merrin' in project['name'].lower():
                                merrin_project = project
                                break
                        
                        if merrin_project:
                            print(f'Found project: {merrin_project["name"]}')
                            
                            # Create assignment
                            assignment_data = {
                                'staffId': staff_member['id'],
                                'projectId': merrin_project['id'],
                                'date': date,
                                'hours': hours
                            }
                            
                            assignment_resp = await client.post('http://localhost:5001/api/assignments', json=assignment_data)
                            if assignment_resp.status_code == 201:
                                print('✅ Successfully created assignment!')
                                result = assignment_resp.json()
                                print(f'Scheduled {staff_member["name"]} for {hours} hours on {date} for project {merrin_project["name"]}')
                                return True
                            else:
                                print(f'❌ Failed to create assignment: {assignment_resp.status_code}')
                                print(assignment_resp.text)
                        else:
                            print('❌ Could not find Merrin project')
                    else:
                        print('❌ Could not fetch projects')
                else:
                    print('❌ Could not find Youssef Sharma')
            else:
                print('❌ Could not connect to staff API')
            
    except Exception as e:
        print(f'❌ Error: {e}')
        return False

if __name__ == "__main__":
    result = asyncio.run(test_scheduling())
    print(f'Test result: {"SUCCESS" if result else "FAILED"}') 