export const IQIYI_BASE_URL = 'https://api.iqiyi.com/3f4/cards.iqiyi.com/views_category/3.0'

export const IQIYI_DETAIL_API_URL = 'https://api.iqiyi.com/vs/common/basicprofile'

export const IQIYI_BASE_PARAMS = {
  from_type: '57',
  calendarId: '-1',
  card_v: '3.0',
  page_st: '0',
  from_category_id: '4',
  from_subtype: '6',
  cid: '4',
  app_k: '69842642483add0a63503306d63f0443',
  app_v: '17.1.7',
  platform_id: '10',
  dev_os: '12',
  net_sts: '1',
  dev_ua: '2201123C',
  qyid: '2aef143f2ce644974da7af3d655124f0110f',
  cupid_v: '3.100.023',
  psp_uid: '',
  psp_sub_uid: '',
  psp_status: '1',
  psp_cki: '',
  secure_v: '1',
  api_v: '27.1',
  secure_p: 'GPhone',
  scrn_scale: '2',
  layout_v: '255.13',
  device_type: '0',
  oaid: '',
  core: '1',
  unlog_sub: '0',
  province_id: '2007',
  app_t: '0',
  service_filter: '',
  youth_model: '0',
  no_rec: '0',
  xas: '1',
  pkg_t: '1',
  dev_t: '1',
  scrn_res: '720,1280',
  dvi: 'enc=2&e=CwUEDV5VLrVVVVMFEXwUJBGNWQDwDfbHXZPVQBPQYdVY0IIHlUDEAXXVV4UEA%3D%3D&assd=false&sua=[Mozilla/5.0 (Linux; Android; wv) AppleWebKit/537.36&otp=2&hmv=-1&hmpm=-1&bmk=b5a10b4f-518e-4776-bdfe-67333df3bb38&upkm=1769873284.73998968&pas=0&nva=1&tck=3&skt=7',
  support: 'hrs,dolby,dv,hrt,hdr',
  device_level: '0',
  iqid: 'd9377a24baccef5c424a7b4b4c0910d001203006',
  dev_brand: 'Xiaomi',
  init_t: '0',
  init_st: '',
  init_new: '1',
  init_sid: 'v7h868ei8merbdv5',
  fst_ts: '1769873285',
  first_install_tm: '1769873269764',
  last_install_tm: '1769873269764',
  imax: '0',
  pad_new: '',
  referer: 'android-app://app.lawnchair',
  fkey: '',
  child_age_range: '-1',
  qyctxv: '1',
  pull_type: '1',
  profile: '{"group":"1,2","counter":1,"hy_id":"","first_time":"20260131","recall_firstdate":"-1","recall_time":"","isSilent":"0"}',
  bi_params: '{"viptab":"cid_order_list_1","PHA-ADR_PHA-APL_1_pbyx":"pbyx_7","PHA-ADR_PHA-APL_1_djrz_title":"title_1","people_id":"0","ct":"20260131","vipService":"new","design":"1","ad_third":"yes","smallvideo":"1","bi_recommend_reason":"recreason","wdym_hd":"0"}'
} as const

export const IQIYI_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.iqiyi.com/',
  'Origin': 'https://www.iqiyi.com',
  'Cache-Control': 'no-cache'
} as const

export const IQIYI_DETAIL_HEADERS = {
  ...IQIYI_HEADERS,
  'Pragma': 'no-cache'
} as const

export interface IqiyiErrorResponse {
  code: -1
  message: string
  error?: string
}