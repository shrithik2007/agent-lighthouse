import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="8a75a21e-ccaa-48cd-8cb5-2384ebec5168",
    name="Book Free First Visit Class and Verify Confirmation",
    tc_id="TC-41",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"pl_7302_visible": "true"},
    global_variables=[{"id": 468887, "name": "visitor_name", "value": "", "session_value": "", "is_persist": False, "environment_id": 0, "environment_name": "No Env"}, {"id": 468888, "name": "visitor_email", "value": "", "session_value": "", "is_persist": False, "environment_id": 0, "environment_name": "No Env"}, {"id": 468889, "name": "visit_date", "value": "", "session_value": "", "is_persist": False, "environment_id": 0, "environment_name": "No Env"}],
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:4104', instruction_id='ec1af5e5-83b5-4a85-b1d4-1faf4e502340'):
        await page.goto("http://localhost:4104")
    
    async with testmu.step('Dismissing the cookie notice', instruction_id='1be7fa53-0aeb-406a-b0c6-a53f3b209411'):
        _loc_1 = page.locator("internal:role=button[name=\"Dismiss cookie notice\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Clicking Book free first visit button', instruction_id='1f2e30e5-8210-4865-867a-41b6b113e896'):
        _loc_2 = page.locator("internal:role=button[name=\"Book free first visit\"i]")
        
        await _loc_2.click()
    
    async with testmu.step('Waiting for the queued plan to start', instruction_id='d740f6eb-a336-4ed1-9b1f-6299ecf5de18'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Click "labeltext"', instruction_id='2da083b0-4bc0-4063-843f-8b9abad5c4c1'):
        _loc_3 = page.locator("internal:text=\"Free first visitFree · 90 min\"i")
        
        await _loc_3.click()
    
    async with testmu.step('Click "Continue booking"', instruction_id='102a3c28-0485-435d-bccb-c6ed24025ebc'):
        _loc_4 = page.locator("internal:role=button[name=\"Continue booking\"i]")
        
        await _loc_4.click()
    
    async with testmu.step('Waiting while your queued plan continues', instruction_id='fd31449f-c6dd-4529-999a-d1ad070f2346'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Type "Sam Rivera" into "Name"', instruction_id='17bc4ef8-402d-47cb-a3ac-5fcaa12a209f'):
        element_0 = page.locator("internal:role=textbox[name=\"Name\"i]")
        
        try:
            await element_0.click(timeout=2000)
        except Exception:
            pass
        await element_0.fill("Sam Rivera")
        try:
            await element_0.press("End", timeout=2000)
        except Exception:
            pass
    
    async with testmu.step('Type "sam@example.com" into "Email"', instruction_id='a259b81f-8b1d-4f21-b74c-8c14f1614607'):
        element_1 = page.locator("internal:role=textbox[name=\"Email\"i]")
        
        try:
            await element_1.click(timeout=2000)
        except Exception:
            pass
        await element_1.fill("sam@example.com")
        try:
            await element_1.press("End", timeout=2000)
        except Exception:
            pass
    
    async with testmu.step('Type "2026-11-02" into "Visit date"', instruction_id='1f9b2d74-badc-40da-9310-c7f5554625ba'):
        element_2 = page.locator("internal:role=textbox[name=\"Visit date\"i]")
        
        try:
            await element_2.click(timeout=2000)
        except Exception:
            pass
        await element_2.fill("2026-11-02")
        try:
            await element_2.press("End", timeout=2000)
        except Exception:
            pass
    
    async with testmu.step('Waiting for the queued plan to execute', instruction_id='dc493c4e-c856-4ad7-8e89-b59837f321d2'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Select "12pm" in "Arrival time"', instruction_id='b4473773-9dc4-4b78-b039-c78f005d29ca'):
        element_3 = page.locator("internal:label=\"Arrival time\"i")
        
        await element_3.select_option()
    
    async with testmu.step('Click "I accept the climbing waiver."', instruction_id='e030a23c-40a2-46f4-b815-a05731334c0d'):
        _loc_5 = page.locator("internal:role=checkbox[name=\"I accept the climbing waiver.\"i]")
        
        await _loc_5.click()
    
    async with testmu.step('Click "I’m not a robot."', instruction_id='851f0067-ae64-451c-906f-072377cc76a1'):
        _loc_6 = page.locator("internal:role=checkbox[name=\"I’m not a robot.\"i]")
        
        await _loc_6.click()
    
    async with testmu.step('Click "Continue"', instruction_id='a9e30349-646b-4124-8724-56f91a779bbe'):
        _loc_7 = page.locator("internal:role=button[name=\"Continue\"i]")
        
        await _loc_7.click()
    
    async with testmu.step('Clicking Confirm booking button', instruction_id='e60c1e7c-9d24-41b6-be17-6843e179d111'):
        _loc_8 = page.locator("internal:role=button[name=\"Confirm booking\"i]")
        
        await _loc_8.click()
    
    async with testmu.step('Waiting for 5000 ms after booking confirmation', instruction_id='596544bc-9d91-488d-bf5b-751dd105ddcb'):
        await page.wait_for_timeout(5000)
    
    async with testmu.step('Checking whether the text PL-7302 is present'):
        set_var('pl_7302_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {27: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (/PL-7302/.test(el(27).innerText));\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:label="Book a class"i >> internal:text="Booked! Ref PL-"i'], query='whether the text PL-7302 is present (in the booking confirmation status)', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='the text PL-7302 is still visible on the page'))
    
    async with testmu.step('Assertion check', instruction_id='4af97643-2872-4efc-a437-e5493ae68614'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'the text PL-7302 is still visible on the page', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{pl_7302_visible}}', 'store_key': 'pl_7302_visible', 'variable_refs': {'{{pl_7302_visible}}': 'true'}}], 'sub_checks': [{'description': 'the text PL-7302 is still visible on the page', 'store_key': 'pl_7302_visible', 'expected_value': 'true', 'extracted_value': '{{pl_7302_visible}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'the text PL-7302 is still visible on the page'})


if __name__ == "__main__":
    testmu.run(test)