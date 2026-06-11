const url = 'https://apihub.kma.go.kr/api/typ02/openApi/getUltraSrtFcst?pageNo=1&numOfRows=100&dataType=JSON&base_date=20260611&base_time=1330&nx=64&ny=102&authKey=SSCp_h23QfGgqf4dt1Hxog';

fetch(url)
  .then(res => {
    console.log('Status:', res.status);
    console.log('Headers:', JSON.stringify([...res.headers.entries()]));
    return res.text();
  })
  .then(text => {
    console.log('Body:', text.substring(0, 500));
  })
  .catch(err => {
    console.error('Error:', err);
  });
