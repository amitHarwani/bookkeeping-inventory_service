import { Transfer, TransferItem } from "../../db";

export class GetTransferResponse {
    constructor(
        public transfer: Transfer,
        public transferItems: Array<TransferItem>
    ) {}
}
