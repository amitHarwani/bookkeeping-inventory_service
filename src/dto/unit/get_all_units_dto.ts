import { Unit } from "../../db";

export class GetAllUnitsResponse {
    constructor(public units: Unit[]) {}
}
