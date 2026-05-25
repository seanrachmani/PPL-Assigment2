import { map } from "ramda";
import { Result, makeOk, makeFailure, bind, mapResult } from "./shared/result";
import { Exp, Program, isProgram, isBoolExp, isNumExp, isStrExp, isVarRef, isPrimOp, isDefineExp, isIfExp, isProcExp, 
        isAppExp, VarDecl, AppExp } from "./L3/L3-ast";

//helper function which converts primitive
const convertPrimOp = (op: string): string =>
    op === "=" || op === "eq?" ? "==" :
    //python function that takes x and checks its type.
    op === "number?" ? "(lambda x: (type(x) == int))" :
    op === "boolean?" ? "(lambda x: (type(x) == bool))" :
    op === "and" ? "and" :
    op === "or" ? "or" :
    op === "not" ? "not" :
    //if its + * just keep it
    op;

//helper function for evaluate app exps
const translateAppExp = (exp: AppExp): Result<string> => {
    if (isPrimOp(exp.rator)) {
        //exp.rator.op is the string reprsenting rator
        const op = exp.rator.op;
        
        if (op === "not") {
            return bind(l2ToPython(exp.rands[0]), (rand: string) => 
                makeOk(`(not ${rand})`));
        }
        //type check operators
        if (op === "boolean?" || op === "number?") {
            //check if op is bool or int then give it the right string
            const pyType = op === "boolean?" ? "bool" : "int";
            return bind(l2ToPython(exp.rands[0]), (rand: string) => 
                makeOk(`(type(${rand}) == ${pyType})`));
        }
        
        //= is like eq? in L2
        const pyOp = op === "=" || op === "eq?" ? "==" : op;
        return bind(mapResult(l2ToPython, exp.rands), (rands: string[]) =>
            //join all the rands with * or + op
            makeOk(`(${rands.join(` ${pyOp} `)})`));
    }
    
    //lambadas exp(strings) - SOMETHING THE USER DEFINED
    return bind(l2ToPython(exp.rator), (rator: string) =>
            bind(mapResult(l2ToPython, exp.rands), (rands: string[]) =>
                makeOk(`${rator}(${rands.join(",")})`)));
};


/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Parsed | Error] => Result<string>
*/
export const l2ToPython = (exp: Exp | Program): Result<string> =>
    isProgram(exp) ? bind(mapResult(l2ToPython, exp.exps), (exps: string[]) => makeOk(exps.join("\n"))) :
    isBoolExp(exp) ? makeOk(exp.val ? "True" : "False") :
    isNumExp(exp) ? makeOk(exp.val.toString()) :
    isStrExp(exp) ? makeOk(`"${exp.val}"`) :
    isVarRef(exp) ? makeOk(exp.var) :
    //helper call:
    isPrimOp(exp) ? makeOk(convertPrimOp(exp.op)) :
    //(define x 5) => x = 5
    isDefineExp(exp) ? bind(l2ToPython(exp.val), (val: string) => 
                            makeOk(`${exp.var.var} = ${val}`)) :
    isIfExp(exp) ? bind(l2ToPython(exp.then), (then: string) =>
                        bind(l2ToPython(exp.test), (test: string) =>
                            bind(l2ToPython(exp.alt), (alt: string) =>
                                makeOk(`(${then} if ${test} else ${alt})`)))) :
    //To make things simpler, you can assume that the body of the lambda expressions contains only one expression:
    isProcExp(exp) ? bind(l2ToPython(exp.body[0]), (body: string) =>
                            makeOk(`(lambda ${map((p: VarDecl) => p.var, exp.args).join(",")} : ${body})`)) :
    //helper function call
    isAppExp(exp) ? translateAppExp(exp) :
    makeFailure("unknown L2 expression type");

