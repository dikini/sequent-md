Here is the complete, unambiguous Extended Backus-Naur Form (EBNF) for your indentation-based sequent calculus grammar.

To model Python-style indentation deterministically in EBNF, we use two explicit structural tokens: INDENT (emitted when the indentation level increases) and DEDENT (emitted when the indentation level decreases to match a previous scope).
```ebnf

(* --- High-Level Structure --- *)
proof_file     = ( rule_definition | blank_line )* ;

rule_definition= rule_identifier SPACE* assignment_op SPACE* NEWLINE 
                   INDENT 
                   deduction_block 
                   DEDENT ;

deduction_block= premise_list NEWLINE SPACE* deduction_op SPACE* NEWLINE premise_or_conclusion ;


(* --- Premises and Conclusions --- *)
premise_list   = premise ( NEWLINE premise )* ;

premise        = rule_reference | formula_string ;

premise_or_conclusion = rule_definition | formula_string ;

(* --- Core Identifiers & Operators --- *)
rule_identifier= [a-zA-Z_] [a-zA-Z0-9_]* ;

rule_reference = rule_identifier ;

assignment_op  = ":=" | "::=" ;

deduction_op   = "=>" | "===>" ;


(* --- Text Formulas (Allows logical symbols & characters) --- *)
formula_string = [^\n\r#:=]+ ;


(* --- Lexer/Structural Control Tokens --- *)
NEWLINE        = "\r\n" | "\n" ;
blank_line     = SPACE* NEWLINE ;
SPACE          = "␠" ;
INDENT         = "INDENT" ; (* Emitted when leading whitespace count increases *)
DEDENT         = "DEDENT" ; (* Emitted when leading whitespace count decreases *)
```
Use code with caution.
Grammar Design Notes for Your Parser

    No-Overlap Identifiers: Because a rule definition must have an assignment_op (:=) immediately following the identifier on the same line, your lexer will never confuse a rule_definition heading with a rule_reference listed inside a premise block. 

    Loose Formula Strings: The formula_string token captures your customized syntax symbols (like |-, ->, ⟨⟩, η, μ) without breaking, because it greedily consumes characters up to the end of the line, ignoring anything that looks like a comment or a structural operator.

    Inline Definitions: The recursive inclusion of rule_definition inside premise_or_conclusion formally allows you to nesting whole sub-trees inline if you choose not to break them out into named components.


