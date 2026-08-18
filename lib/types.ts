export type BlindRecruitmentItem = {
  orgCoName: string;
  recFieldDetl: string;
  ncsCICdNm: string;
  recrtNo: string;
};

export type Pagination = {
  pageNo: number;
  numOfRows: number;
  totalCount: number;
  totalPage: number;
};

export type ApiSuccess = {
  success: true;
  data: { items: BlindRecruitmentItem[]; pagination: Pagination };
};

export type ApiFailure = {
  success: false;
  error: { code: string; message: string };
};

export type ApiResponse = ApiSuccess | ApiFailure;
