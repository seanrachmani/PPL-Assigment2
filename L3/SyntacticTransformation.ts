import { ClassExp, ProcExp, Exp, Program, CExp, Binding, makeProcExp, makeIfExp, makeAppExp, makePrimOp, makeVarDecl, makeVarRef, makeLitExp} from "./L3-ast";
import { Result, makeFailure } from "../shared/result";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
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
        methods[0].val, methods2if(methods.slice(1)));



/*
Purpose: Transform all class forms in the given AST to procs
Signature: transform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const transform = (exp: Exp | Program): Result<Exp | Program> =>
    //@TODO
    makeFailure("ToDo");

