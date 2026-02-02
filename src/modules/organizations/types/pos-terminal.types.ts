export interface PosTerminal {
  id: string;
  name?: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  allowedUsers: string[];
  active?: boolean;
}
