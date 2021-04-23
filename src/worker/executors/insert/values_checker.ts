import { TableMeta } from "@/worker/model/table_meta";
import { promise, IColumnOption, TStringAny, ERROR_TYPE, DATA_TYPE } from "@/common";
import { IColumn } from "@/worker/interfaces";
import { getDataType, LogHelper, isNull } from "@/worker/utils";


export class ValuesChecker {
    table: TableMeta;
    autoIncrementValue;

    constructor(table: TableMeta, autoIncValues) {
        this.table = table;
        this.autoIncrementValue = autoIncValues;
    }

    checkAndModifyValues(values: object[]) {
        let err: LogHelper;
        values.every((item) => {
            err = this.checkAndModifyValue(item);
            return err ? false : true;
        });
        return { err, values };
    }

    private checkAndModifyValue(value) {
        let error: LogHelper;
        this.table.columns.every(column => {
            error = this.checkAndModifyColumnValue_(column, value);
            return error ? false : true;
        })
        return error;
    }

    private checkNotNullAndDataType_(column: IColumn, value: TStringAny) {
        // check not null schema
        if (column.notNull && isNull(value[column.name])) {
            return this.getError(ERROR_TYPE.NullValue, { ColumnName: column.name });
        }
        // check datatype
        else if (column.dataType && !isNull(value[column.name]) &&
            getDataType(value[column.name]) !== column.dataType) {
            return this.getError(ERROR_TYPE.WrongDataType, { column: column.name });
        }
    }

    private checkAndModifyColumnValue_(column: IColumn, value: TStringAny) {
        const columnValue = value[column.name];
        // check auto increment scheme
        if (column.autoIncrement) {
            // if value is null, then create the autoincrement value
            if (isNull(columnValue)) {
                value[column.name] = ++this.autoIncrementValue[column.name];
            }
            else {
                if (getDataType(columnValue) === DATA_TYPE.Number) {
                    // if column value is greater than autoincrement value saved, then make the
                    // column value as autoIncrement value
                    if (columnValue > this.autoIncrementValue[column.name]) {
                        this.autoIncrementValue[column.name] = columnValue;
                    }
                }
            }
        }
        // check Default Schema
        else if (column.default !== undefined && isNull(columnValue)) {
            value[column.name] = column.default;
        }
        return this.checkNotNullAndDataType_(column, value);
    }

    private getError(error: ERROR_TYPE, details: object) {
        return new LogHelper(error, details);
    }
}