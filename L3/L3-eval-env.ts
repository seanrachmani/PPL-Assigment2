// L3-eval.ts
// Evaluator with Environments model

import { map } from "ramda";
import { isBoolExp, isCExp, isLitExp, isNumExp, isPrimOp, isStrExp, isVarRef,
         isAppExp, isDefineExp, isIfExp, isLetExp, isProcExp,
         Binding, VarDecl, CExp, Exp, IfExp, LetExp, ProcExp, Program,
         parseL3Exp,  DefineExp, isClassExp} from "./L3-ast";
import { applyEnv, makeEmptyEnv, makeExtEnv, Env } from "./L3-env-env";
import { isClosure, makeClosureEnv, Closure, Value, makeClassEnv, isClassEnv, isObject, ClassEnv, makeMethodValue, MethodValue, makeObject, L3Object, isSymbolSExp } from "./L3-value";
import { applyPrimitive } from "./evalPrimitive";
import { allT, first, rest, isEmpty, isNonEmptyList } from "../shared/list";
import { Result, makeOk, makeFailure, bind, mapResult } from "../shared/result";
import { parse as p } from "../shared/parser";
import { format } from "../shared/format";

// ========================================================
// Eval functions

const applicativeEval = (exp: CExp, env: Env): Result<Value> =>
    isNumExp(exp) ? makeOk(exp.val) :
    isBoolExp(exp) ? makeOk(exp.val) :
    isStrExp(exp) ? makeOk(exp.val) :
    isPrimOp(exp) ? makeOk(exp) :
    isVarRef(exp) ? applyEnv(env, exp.var) :
    isLitExp(exp) ? makeOk(exp.val) :
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? evalProc(exp, env) :
    isLetExp(exp) ? evalLet(exp, env) :
    isAppExp(exp) ? bind(applicativeEval(exp.rator, env),
                      (proc: Value) =>
                        bind(mapResult((rand: CExp) => 
                           applicativeEval(rand, env), exp.rands),
                              (args: Value[]) =>
                                 applyProcedure(proc, args))) :
    isClassExp(exp) ? makeOk(makeClassEnv(exp.fields, exp.methods, env)) :
    makeFailure('"let" not supported (yet)');

export const isTrueValue = (x: Value): boolean =>
    ! (x === false);

const evalIf = (exp: IfExp, env: Env): Result<Value> =>
    bind(applicativeEval(exp.test, env), (test: Value) => 
            isTrueValue(test) ? applicativeEval(exp.then, env) : 
            applicativeEval(exp.alt, env));

const evalProc = (exp: ProcExp, env: Env): Result<Closure> =>
    makeOk(makeClosureEnv(exp.args, exp.body, env));

// KEY: This procedure does NOT have an env parameter.
//      Instead we use the env of the closure.
const applyProcedure = (proc: Value, args: Value[]): Result<Value> =>
    isPrimOp(proc) ? applyPrimitive(proc, args) :
    isClosure(proc) ? applyClosure(proc, args) :
    isClassEnv(proc) ? applyClass(proc, args) :
    isObject(proc) ? applyMethod(proc, args) :
    makeFailure(`Bad procedure ${format(proc)}`);


/*
==========================myCode========================================
*/


//create new env (vars names, vars values, father env)
//this function creates env with specific classval fields vars, values, env
//map gives us list of fields as strings
const makeClsEnv = (classVal: ClassEnv, args: Value[]) =>
    makeExtEnv(map((vard: VarDecl) => vard.var, classVal.fields), args, classVal.env);




//we call this when we have new ovject instance(we have (pair 3 4) and pair is class operator)
//bind(try, ehat to do if ok)
//go throgh methods,  eval them using applicatative eval, make env, and if  good makeMethod.
//if we succed eval all methods make object

const applyClass = (classVal: ClassEnv, args: Value[]): Result<Value> =>
    classVal.fields.length !== args.length ? makeFailure("Incorrect number of arguments for class") :
    bind(
        mapResult(
            (method: Binding) => 
            bind(
                //*****method.val here is binding from ast! and itscexp we send for evaluation and then we get closure****
                applicativeEval(method.val, makeClsEnv(classVal, args)),
                (evaluatedMet: Value) => makeOk(makeMethodValue(method.var.var,evaluatedMet))
                )
            ,classVal.methods), //this is where to mapresultfrom. then mapresult created methodValue[] and we can create object:
        (evaluatedMethods: MethodValue[]) => makeOk(makeObject(evaluatedMethods)) // this is or first bind
    );






//(p34 'first)
//same as sub but this time closure has enc so no ned to applyProc with env param
export const applyMethod = (obj: L3Object, args: Value[]): Result<Value> => {
    if (!isSymbolSExp(args[0])) return makeFailure("no symbol as required for method call");
    const methodName = args[0].val;
    const method = obj.methods.find(method => method.name === methodName);
    if (!method) return makeFailure(`Unrecognized method: ${methodName}`);
    return applyProcedure(method.val, args.slice(1));
};


/*
==========================myCode========================================
*/






const applyClosure = (proc: Closure, args: Value[]): Result<Value> => {
    const vars = map((v: VarDecl) => v.var, proc.params);
    return evalSequence(proc.body, makeExtEnv(vars, args, proc.env));
}

// Evaluate a sequence of expressions (in a program)
export const evalSequence = (seq: Exp[], env: Env): Result<Value> =>
    isNonEmptyList<Exp>(seq) ? evalCExps(first(seq), rest(seq), env) : 
    makeFailure("Empty sequence");
    
const evalCExps = (first: Exp, rest: Exp[], env: Env): Result<Value> =>
    isDefineExp(first) ? evalDefineExps(first, rest, env) :
    isCExp(first) && isEmpty(rest) ? applicativeEval(first, env) :
    isCExp(first) ? bind(applicativeEval(first, env), _ => evalSequence(rest, env)) :
    first;
    
// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
const evalDefineExps = (def: DefineExp, exps: Exp[], env: Env): Result<Value> =>
    bind(applicativeEval(def.val, env), (rhs: Value) => 
            evalSequence(exps, makeExtEnv([def.var.var], [rhs], env)));


// Main program
export const evalL3program = (program: Program): Result<Value> =>
    evalSequence(program.exps, makeEmptyEnv());

export const evalParse = (s: string): Result<Value> =>
    bind(p(s), (x) => 
        bind(parseL3Exp(x), (exp: Exp) =>
            evalSequence([exp], makeEmptyEnv())));

// LET: Direct evaluation rule without syntax expansion
// compute the values, extend the env, eval the body.
const evalLet = (exp: LetExp, env: Env): Result<Value> => {
    const vals  = mapResult((v: CExp) => 
        applicativeEval(v, env), map((b: Binding) => b.val, exp.bindings));
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    return bind(vals, (vals: Value[]) => 
        evalSequence(exp.body, makeExtEnv(vars, vals, env)));
}
