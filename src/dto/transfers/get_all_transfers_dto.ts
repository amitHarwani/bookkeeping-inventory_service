import { Transfer } from "../../db";

export class GetAllTransfersRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public cursor?: {
            transferId: number;
            createdAt: Date;
        },
        public query?: {
            type: "ALL" | "RECEIVED" | "SENT";
            fromDate?: string;
            toDate?: string;
        },
        public select?: [keyof Transfer]
    ) {}
}

export class GetAllTransfersResponse<T> {
    constructor(
        public transfers: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            transferId: number;
            createdAt: Date;
        }
    ) {}
}
