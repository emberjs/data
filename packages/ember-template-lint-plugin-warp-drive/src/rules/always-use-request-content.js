const { Rule } = require('ember-template-lint');

class AlwaysUseRequestContent extends Rule {
  visitor() {
    return {
      ElementNode: (node) => {
        // Only check <Request> components
        if (node.tag !== 'Request') {
          return;
        }

        // Find named blocks within the Request component
        const namedBlocks = this.findNamedBlocks(node);
        const contentBlock = namedBlocks.find((block) => block.name === 'content');
        const otherBlocks = namedBlocks.filter((block) => block.name !== 'content');
        
        // Check if there are any non-named-block children (default content)
        const hasDefaultContent = node.children.some((child) => 
          child.type !== 'ElementNode' || !child.tag.startsWith(':')
        );

        // Case 1: Request with default content instead of named blocks
        if (hasDefaultContent && namedBlocks.length === 0) {
          this.log({
            message: 'The <Request> component should use named blocks (e.g., :content, :loading, :error, :idle) instead of default content',
            node,
          });
          return;
        }

        // Case 2: Request with no blocks at all
        if (namedBlocks.length === 0 && !hasDefaultContent) {
          this.log({
            message: 'The <Request> component should have at least one named block (e.g., :content, :loading, :error, :idle)',
            node,
          });
          return;
        }

        // Case 3: Request with content block - need to check if result is used
        if (contentBlock) {
          this.validateContentBlock(contentBlock, node);
        }
      }
    };
  }

  findNamedBlocks(requestNode) {
    const namedBlocks = [];
    
    for (const child of requestNode.children) {
      if (child.type === 'ElementNode' && child.tag.startsWith(':')) {
        const blockName = child.tag.slice(1); // Remove the ':' prefix
        namedBlocks.push({
          name: blockName,
          node: child,
          params: child.blockParams || []
        });
      }
    }
    
    return namedBlocks;
  }

  validateContentBlock(contentBlock, requestNode) {
    const blockParams = contentBlock.params;
    
    // If no block params, the content block should yield at least the result
    if (blockParams.length === 0) {
      this.log({
        message: 'The <Request> component\'s content block should yield a result parameter that is used within the block',
        node: requestNode,
      });
      return;
    }

    // First parameter is the result, second is state
    const resultParam = blockParams[0];
    const resultParamName = resultParam?.original;
    
    if (!resultParamName) {
      this.log({
        message: 'The <Request> component\'s content block should yield a result parameter that is used within the block',
        node: requestNode,
      });
      return;
    }

    // Check if the result parameter is actually used in the block content
    const isResultUsed = this.isParamUsedInBlock(resultParamName, contentBlock.node);
    
    if (!isResultUsed) {
      this.log({
        message: `The <Request> component's content block yields a result parameter '${resultParamName}' that is not used within the block`,
        node: requestNode,
      });
    }
  }

  isParamUsedInBlock(paramName, blockNode) {
    // We need to traverse the AST of the block to see if the parameter is referenced
    return this.findVariableUsage(paramName, blockNode);
  }

  findVariableUsage(variableName, node) {
    if (!node) return false;

    // Check different node types for variable usage
    switch (node.type) {
      case 'Program':
        // Check all body statements
        return node.body?.some((child) => this.findVariableUsage(variableName, child)) || false;
        
      case 'MustacheStatement':
      case 'SubExpression':
        // Check if the path references our variable
        if (this.isPathReferencing(node.path, variableName)) {
          return true;
        }
        // Check parameters
        return node.params?.some((param) => this.findVariableUsage(variableName, param)) || false;
        
      case 'PathExpression':
        return this.isPathReferencing(node, variableName);
        
      case 'BlockStatement':
        // Check the path, params, and program
        if (this.isPathReferencing(node.path, variableName)) {
          return true;
        }
        if (node.params?.some((param) => this.findVariableUsage(variableName, param))) {
          return true;
        }
        if (this.findVariableUsage(variableName, node.program)) {
          return true;
        }
        if (node.inverse && this.findVariableUsage(variableName, node.inverse)) {
          return true;
        }
        return false;
        
      case 'ElementNode':
        // Check attributes
        if (node.attributes?.some((attr) => this.findVariableUsage(variableName, attr.value))) {
          return true;
        }
        // Check modifiers
        if (node.modifiers?.some((mod) => 
          this.isPathReferencing(mod.path, variableName) ||
          mod.params?.some((param) => this.findVariableUsage(variableName, param))
        )) {
          return true;
        }
        // Check children
        return node.children?.some((child) => this.findVariableUsage(variableName, child)) || false;
        
      case 'TextNode':
        return false;
        
      case 'ConcatStatement':
        return node.parts?.some((part) => this.findVariableUsage(variableName, part)) || false;
        
      case 'AttrNode':
        // Check the attribute value
        return this.findVariableUsage(variableName, node.value);
        
      default:
        // For any other node type, check if it has children to traverse
        if (node.children) {
          return node.children.some((child) => this.findVariableUsage(variableName, child));
        }
        return false;
    }
  }

  isPathReferencing(pathNode, variableName) {
    if (!pathNode) return false;
    
    // For simple paths, check if it starts with our variable
    if (pathNode.type === 'PathExpression') {
      // Check if the path starts with our variable name
      // e.g., "result", "result.data", "result.data.name" all reference "result"
      return pathNode.original === variableName || 
             pathNode.original.startsWith(variableName + '.') ||
             (pathNode.parts && pathNode.parts[0] === variableName);
    }
    
    return false;
  }
}

module.exports = AlwaysUseRequestContent;