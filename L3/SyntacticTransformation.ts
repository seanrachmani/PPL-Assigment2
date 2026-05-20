import { ClassExp, ProcExp, Exp, Program, CExp, Binding, makeProcExp, makeIfExp, makeAppExp, makePrimOp, makeVarDecl, makeVarRef, makeLitExp, isDefineExp} from "./L3-ast";
import { isAppExp, isClassExp, isIfExp, isProcExp, isLetExp, makeLetExp, makeDefineExp, makeBinding, makeProgram, isProgram } from "./L3-ast";
import { Result, makeFailure, makeOk } from "../shared/result";
import { map } from "ramda";


/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
//[] for cexp due to makeproc requirments 
export const class2proc = (exp: ClassExp): ProcExp =>
    makeProcExp(exp.fields, [makeProcExp([makeVarDecl("msg")], [methods2if(exp.methods)])]);

//helper function for 10000 ifs(so FUN ==))) )
//error if we didnt find the method
export const methods2if = (methods: Binding[]) : CExp =>
    (methods.length === 0) ? makeLitExp({tag: "SymbolSExp", val: "error"}) :
    makeIfExp(
        //test:   //makeappexp
        makeAppExp(makePrimOp("eq?"), [makeVarRef("msg"), makeLitExp({tag: "SymbolSExp", val: methods[0].var.var})]),
        //then, else:
        //method[0].val is cexp, methos[0].val.body s proc body and methods[0].val.body[0] is the only elemnt in proc body
        isProcExp(methods[0].val) ? methods[0].val.body[0] : methods[0].val,
        //else:
        methods2if(methods.slice(1)));



/*
Purpose: Transform all class forms in the given AST to procs
Signature: transform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/
//aka creating new AST

export const transform = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? makeOk(makeProgram(map(transformExp, exp.exps))) :
    makeOk(transformExp(exp));



//helper function
//going deeply on all AST nodes expecpt the leavs and making transformation for current road(one cexp)
//every compund exp that has child nodes which also father-> need to transform childs too,
export const transformCExp = (exp: CExp): CExp =>
    isClassExp(exp) ? transformCExp(class2proc(exp)) :
    isIfExp(exp)    ? makeIfExp(transformCExp(exp.test), transformCExp(exp.then), transformCExp(exp.alt)) : 
    isAppExp(exp)   ? makeAppExp(transformCExp(exp.rator), map(transformCExp, exp.rands)) :
    isProcExp(exp)  ? makeProcExp(exp.args, map(transformCExp, exp.body)) :
    isLetExp(exp)   ? makeLetExp(map((b: Binding) => makeBinding(b.var.var,transformCExp(b.val)), exp.bindings), map(transformCExp, exp.body)) :
    exp;


//helper function2 for EXP (define / cexp) 
//it treats define
export const transformExp = (exp: Exp): Exp =>
    isDefineExp(exp) ? makeDefineExp(exp.var, transformCExp(exp.val)) :
    transformCExp(exp);



