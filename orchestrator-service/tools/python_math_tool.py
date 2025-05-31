import ast
import operator as op
import json
# from crewai.tools import BaseTool (removed due to updated crewai API)

# supported operators
operators = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.Pow: op.pow,
    ast.USub: op.neg
}


def safe_eval(node):
    if isinstance(node, ast.Expression):
        return safe_eval(node.body)
    elif isinstance(node, ast.Num):
        return node.n
    elif isinstance(node, ast.BinOp):
        if type(node.op) not in operators:
            raise ValueError(f"Unsupported operator: {node.op}")
        return operators[type(node.op)](safe_eval(node.left), safe_eval(node.right))
    elif isinstance(node, ast.UnaryOp):
        if type(node.op) not in operators:
            raise ValueError(f"Unsupported operator: {node.op}")
        return operators[type(node.op)](safe_eval(node.operand))
    elif isinstance(node, ast.Call):
        func = node.func.id
        args = [safe_eval(arg) for arg in node.args]
        if func == 'sum':
            return sum(args[0])
        if func in ['avg', 'mean']:
            data = args[0]
            return sum(data) / len(data) if data else 0
        raise ValueError(f"Unsupported function: {func}")
    elif isinstance(node, ast.List):
        return [safe_eval(elt) for elt in node.elts]
    else:
        raise ValueError(f"Unsupported node type: {type(node)}")

class PythonMathTool:
    name: str = "pythonMath"
    description: str = (
        "Evaluate basic math expressions with support for sum, avg/mean.")

    def _run(self, expression: str) -> str:
        """
        Safely evaluate a math expression and return the result.
        """
        try:
            parsed = ast.parse(expression, mode='eval')
            result = safe_eval(parsed)
            # Return result as JSON string
            return json.dumps({'result': result})
        except Exception as e:
            return f"Error evaluating expression: {str(e)}" 