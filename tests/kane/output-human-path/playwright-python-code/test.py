import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="ee50805c-df75-4e1b-9d82-4946b17a37ce",
    name="Book Free First Visit and Verify Confirmation",
    tc_id="TC-24",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"pl_4821_visible": "true"},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:4101', instruction_id='241f4264-86bb-4c1e-8380-85bf6661eb78'):
        await page.goto("http://localhost:4101")
    
    async with testmu.step('Clicking Dismiss cookie notice button', instruction_id='4367079b-da81-4893-8989-73a636db5c03'):
        _loc_1 = page.locator("internal:role=button[name=\"Dismiss cookie notice\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Clicking the Book a free visit button', instruction_id='75c03324-f30c-4155-b505-76487fb6a059'):
        _loc_2 = page.locator("#hero-go")
        
        await _loc_2.click()
    
    async with testmu.step('Waiting for the next form step in the queued plan', instruction_id='25b56b96-7756-46fd-bcd9-05966750cc83'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Type "Sam Rivera" into "Your name"', instruction_id='d17612c7-a3c8-482e-99d7-ce880d6ec8dc'):
        element_0 = page.locator("internal:role=textbox[name=\"Your name\"i]")
        
        try:
            await element_0.click(timeout=2000)
        except Exception:
            pass
        await element_0.fill("Sam Rivera")
        try:
            await element_0.press("End", timeout=2000)
        except Exception:
            pass
    
    async with testmu.step('Type "sam@example.com" into "Email address"', instruction_id='5f0ffb3e-1e9f-4791-affa-2346f214947a'):
        element_1 = page.locator("internal:role=textbox[name=\"Email address\"i]")
        
        try:
            await element_1.click(timeout=2000)
        except Exception:
            pass
        await element_1.fill("sam@example.com")
        try:
            await element_1.press("End", timeout=2000)
        except Exception:
            pass
    
    async with testmu.step('Type "2026-11-02" into "Visit date"', instruction_id='c7c5ea62-f564-49e1-9e17-23c3292a4ab7'):
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
    
    async with testmu.step('Clicking the 12pm arrival time option', instruction_id='103b72a6-846d-485b-96b6-6ff3bd22bdd6'):
        _loc_3 = page.locator("internal:text=\"12pm\"i")
        
        await _loc_3.click()
    
    async with testmu.step('Clicking the climbing waiver acceptance checkbox', instruction_id='5588b0ea-70dc-4a02-affe-8899fae105b4'):
        _loc_4 = page.locator("internal:role=checkbox[name=\"I accept the climbing waiver.\"i]")
        
        await _loc_4.click()
    
    async with testmu.step('Clicking Confirm my free visit button', instruction_id='2b8df283-cd83-4a01-9fa3-7af59bf0846f'):
        _loc_5 = page.locator("internal:role=button[name=\"Confirm my free visit\"i]")
        
        await _loc_5.click()
    
    async with testmu.step('Waiting for 5 seconds after booking confirmation', instruction_id='a06c907f-490c-47ea-8fe5-7c415b2736b3'):
        await page.wait_for_timeout(5000)
    
    async with testmu.step('Checking whether the reference code is present'):
        set_var('pl_4821_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {40: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(40).textContent.includes('PL-4821'));\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Reference code: PL-"i'], query='whether the text PL-4821 is present (in the booking confirmation reference code)', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='the text PL-4821 is still visible on the page'))
    
    async with testmu.step('Assertion check', instruction_id='9deff88f-ebe1-4940-9413-3ebdeb8b2e3a'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'the text PL-4821 is still visible on the page', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{pl_4821_visible}}', 'store_key': 'pl_4821_visible', 'variable_refs': {'{{pl_4821_visible}}': 'true'}}], 'sub_checks': [{'description': 'the text PL-4821 is still visible on the page', 'store_key': 'pl_4821_visible', 'expected_value': 'true', 'extracted_value': '{{pl_4821_visible}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'the text PL-4821 is still visible on the page'})


if __name__ == "__main__":
    testmu.run(test)