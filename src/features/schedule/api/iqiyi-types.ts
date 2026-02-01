export interface IqiyiTabResponse {
  code: number
  cards: Array<{
    blocks: Array<{
      native_ext: {
        daily_hot_tab: {
          nav: Array<{
            date: string
            day_of_week: string
            today?: string
            option: string
          }>
        }
      }
    }>
  }>
}

export interface IqiyiContentResponse {
  code: number
  cards: Array<{
    blocks: Array<{
      block_id: string
      images: Array<{
        url: string
        name: string
      }>
      metas: Array<{
        text: string
        name: string
      }>
      actions?: {
        click_event: {
          data: {
            album_id: string
            tv_id?: string
          }
        }
      }
      statistics?: {
        r_taid: string
      }
      other?: {
        offical_id: string
      }
    }>
  }>
}

export interface IqiyiDetailResponse {
  code: number
  data?: {
    [key: string]: any
  }
  message?: string
}

export interface IqiyiBaseResponse {
  code: number
  message?: string
}