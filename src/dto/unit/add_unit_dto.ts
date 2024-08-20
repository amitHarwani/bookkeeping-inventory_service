import { Unit } from "../../db";

export class AddUnitRequest {
    constructor(
        public unitName: string,
        public companyId: number
    ) {}
}

export class AddUnitResponse {
    constructor(
        public unit: Unit,
        public message: string
    ) {}
}
