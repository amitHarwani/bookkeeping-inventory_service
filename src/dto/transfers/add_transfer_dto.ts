import { Transfer, TransferItem } from "../../db";

export interface TransferItemsRequest {
    itemId: number;
    itemName: string;
    unitId: number;
    unitName: string;
    unitsTransferred: number;
}
export class AddTransferRequest {
    constructor(
        public fromCompanyId: number,
        public fromCompanyName: string,
        public toCompanyId: number,
        public toCompanyName: string,
        public items: Array<TransferItemsRequest>
    ) {}
}

export class AddTransferResponse {
    constructor(
        public transfer: Transfer,
        public transferItems: Array<TransferItem>,
        public message: string
    ) {}
}
