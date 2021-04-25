import { Base } from "./base";
import { SelectQuery, QUERY_OPTION, ERROR_TYPE } from "@/common";
import { getRegexFromLikeExpression, promiseReject } from "@worker/utils";
import { LogHelper, getObjectFirstKey, getDataType, getLength, getError } from "@worker/utils";
import { WhereChecker } from "./where_checker";
import { executeWhereLogic } from "./select/where";

export class BaseFetch extends Base {

    whereCheckerInstance: WhereChecker;
    executeWhereLogic: typeof executeWhereLogic;
    skipRecord;
    limitRecord;
    shouldEvaluateLimitAtEnd = false;
    shouldEvaluateSkipAtEnd = false;

    protected shouldAddValue(value) {
        return this.whereCheckerInstance.check(value);
    };
    protected goToWhereLogic() {
        const query = this.query as SelectQuery;
        const firstColumn = getObjectFirstKey(query.where);
        if (this.objectStore.indexNames.contains(firstColumn)) {
            const value = query.where[firstColumn];
            if (getDataType(value) === 'object') {
                const checkFlag = getLength(value) > 1 ||
                    getLength(query.where) > 1

                this.whereCheckerInstance = new WhereChecker(query.where, checkFlag);
                const key = getObjectFirstKey(value);
                this.whereCheckerInstance.remove([firstColumn, key]);
                switch (key) {
                    case QUERY_OPTION.Like: {
                        const regexVal = getRegexFromLikeExpression(value[QUERY_OPTION.Like]);
                        return (this as any).executeRegexLogic(firstColumn, regexVal);
                    }
                    case QUERY_OPTION.Regex:
                        return (this as any).executeRegexLogic(firstColumn, value[QUERY_OPTION.Regex]);
                    case QUERY_OPTION.In:
                        return (this as any).executeInLogic(
                            firstColumn, value[QUERY_OPTION.In]
                        );
                    case QUERY_OPTION.Between:
                    case QUERY_OPTION.GreaterThan:
                    case QUERY_OPTION.LessThan:
                    case QUERY_OPTION.GreaterThanEqualTo:
                    case QUERY_OPTION.LessThanEqualTo:
                        return this.executeWhereLogic(firstColumn, value, key, "next");
                    case QUERY_OPTION.Aggregate: break;
                    default:
                        return this.executeWhereLogic(firstColumn, value, null, "next");
                }
            }
            else {
                const checkFlag = getLength(query.where) > 1;
                this.whereCheckerInstance = new WhereChecker(query.where, checkFlag);
                this.whereCheckerInstance.remove([firstColumn]);
                return this.executeWhereLogic(firstColumn, value, null, "next");
            }
        }
        else {
            const column = this.getColumnInfo(firstColumn);
            const error = column == null ?
                new LogHelper(ERROR_TYPE.ColumnNotExist, { column: firstColumn }) :
                new LogHelper(ERROR_TYPE.EnableSearchOff, { column: firstColumn });
            return promiseReject(
                getError(error, true)
            );
        }
    }

}