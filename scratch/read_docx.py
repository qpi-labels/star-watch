import zipfile
import xml.etree.ElementTree as ET

docx_path = r"c:\Users\erida\OneDrive\Documents\repo\es\단기예보조회서비스_API활용가이드_241128.docx"
output_path = r"c:\Users\erida\OneDrive\Documents\repo\es\guide_text.txt"

try:
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml')
        
    root = ET.fromstring(xml_content)
    
    # namespaces
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    text_parts = []
    for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        p_text = []
        for run in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
            if run.text:
                p_text.append(run.text)
        if p_text:
            text_parts.append(''.join(p_text))
            
    full_text = '\n'.join(text_parts)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_text)
        
    print("Successfully extracted text. First 500 characters:")
    print(full_text[:500])
except Exception as e:
    print("Error:", e)
