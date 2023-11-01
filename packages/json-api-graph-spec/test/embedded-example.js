function hbs(source) {}
function aql(source) {}

export const temp1 = hbs`{{hello}}`;
export const temp2 = aql`
  # /companies-query.aql
  # This is a Comment
  QUERY employee { # we wrap our query definition in QUERY {}
    data { # the graph of data we want back goes in data
      name
      company {
        name
        ceo { # relationships with {} after them will be included
          name
          # if ceo is an employee and something else
          # also declares fields for an employee, the
          # field sets will be merged
          profileImage
        }
      }
    }
    filter {
      # @arg is used to declare variables
      # the argument type is infered from the initializer value
      # if there is one, but may be overriden by supplying
      # a valid arg type list in parens
      company {
        @arg(null,string) size = "large"
      }
    }
    # statements may be ended by a \`;\`, \`#\`, \`}\` or newline
    page { @arg size = 10 }
  }
  `;
