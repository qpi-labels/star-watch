// Current date in KST: 2026-06-11 14:10
// Let's set tm1 to 202606111300 and tm2 to 202606111410
const url = 'https://apihub.kma.go.kr/api/typ01/url/sfc_nc_var.php?tm1=202606111300&tm2=202606111410&lon=126.96579&lat=37.57141&obs=ta,hm,td,rn_ox,vs&authKey=SSCp_h23QfGgqf4dt1Hxog';

fetch(url)
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(text => {
    console.log('Body:\n', text);
  })
  .catch(err => {
    console.error('Error:', err);
  });
