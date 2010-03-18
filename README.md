# Hugs!

**Hugs!** is a templating system that loves you. It is inspired in part by the [template discussion][1] 
on the jQuery forum and was created as a proof of concept from things that the author already had 
lying around.

The following are a few of the design goals:

  * Use actual *JavaScript* for the logic, but keep the logic restricted to a subset 
    that prevents, or at the very least deters, user from adding too much logic 
    into the templates themselves.

  * Keep it simple (and small) both in terms of API & code size.

  * Templates should be debuggable, or at least the system should report errors in
    the templates to the user as much as possible.
    
  * The system should work for any text, not just HTML.


## An example:

With this input:

    {
      products: [
        { name: "Krukka", price: 131 },
        { name: "Pöppla", price: 62 },
        { name: "Brogge", price: 88 }
      ]
    }

The following template:

    <table>
      {{ each products }}
      <tr class="{{ each.counter % 2 ? "odd" : "even" }}">
        <td>{{= upper( name ) }}</td>
        <td>{{= price }} kr</td>
      </tr>
      {{ end }}
    </table>

Will render to:

    <table>
      <tr class="even">
        <td>KRUKKA</td>
        <td>131 kr</td>
      </tr>
      <tr class="odd">
        <td>PÖPPLA</td>
        <td>62 kr</td>
      </tr>
      <tr class="even">
        <td>BROGGE</td>
        <td>88 kr</td>
      </tr>
    </table>

## The template syntax:

Syntax is *JavaScript* except assignments are disallowed (`=`, `++`, and so on), so 
are all keywords that are not assignment operators (`delete`, `new`).

This means that you can write pretty much anything as long as you aren't defining 
new objects or trying to assign to or change variables.

### Tags:

Tags are defined by the `{{` and `}}` delimiters. The can be either blocks or singles.

Blocks are terminated with an `{{ end }}` tag:

    {{ if ( name ) }}
      Your name:
    {{ end }}

Block tags may additionally offer support for `{{ else }}`:

    {{ each ( foo ) }}
      every foo item
    {{ else }}
      foo has no length
    {{ end }}

    {{ if ( name ) }}
      Your name:
    {{ end }}


Single tags look the same as block tags except that they aren't terminated by `{{ end }}`
and rather than enclosing a block of text, they simply stand alone:

    {{ include "templatename" }}

Refer to each tag's documentation regarding the need to terminate it.

The first word in the tag is the template tag you want to run, and the following 
are it's arguments. The system supports traditional syntax:

    {{ if ( name.length && typeof name[0] === "string" ) }}
    ...

Or parentheses may alternatively be omitted:

    {{ if name.length && typeof name[0] === "string" }}
    ...

The only exception to the "first word" rule is the `=` tag which simply writes
out it's argument. It does not require a terminator.

    My name is: {{= name }}

You can use JavaScript as you would within the tags:

    You are logged in as: {{= name ? name : "Anonymous" }}

    <li class="{{= i % 2 ? "odd" : "even" }}">



### Comments:

Any text within `{# #}` will be interpreted as a comment and not rendered out by 
the system. This template:

    <ul>{# loop though the users... #}
      {{ if username }}
      <li>{{= username }}</li>
      {{ end }}
    </ul>

Might be rendered out like this:

    <ul>
      <li>fred83</li>
    </ul>



## Built in tags & functions:

The system includes a couple of built-in tags:

### Tags

  * `{{= a }}` 
    - Replace this tag with the contents of `a`.

  * `{{ if a }}` ... `{{ else }}` ... `{{ end }}`<br>
    `{{ if a }}` ... `{{ end }}`
    - if `a` is *true*, then the contents of the former block will be written out,
      otherwise (if `a` is *false*) the content of the later block (if it's there).

  * `{{ each a }}` ... `{{ else }}` ... `{{ end }}`<br>
    `{{ each a }}` ... `{{ end }}`
    - For every item in `a`, print the contents of the former block. If `a` is 
      an empty list, or not an iterable object, then the content of the later 
      block will be written out (if it's there).

  * `{{ include a }}`
    - Replace this tag with the rendering of the saved template named `a`. 

  * `{{ filter a }}` ... `{{ end }}`
    - The content of the block will be run through the function `a` before being written.


## Functions

Any functions defined by `Template.fn` will be available on evaluation time.

  * `upper( v )`
    - Returns the uppercase value of `v`. If `v` isn't a string then it will be converted to one.

  * `lower( v )`
    - Returns the lowercase value of `v`. If `v` isn't a string then it will be converted to one.

  * `escape( v )`
    - Returns `v` with the characters `& < > "` escaped to HTML entities.
      If `v` isn't a string then it will be converted to one.


## How to use:

Creating a new template:

    var myTemplate = Template( "name: {{ name }}" );

Create and render a template:

    var myTemplate = Template( "name: {{= name }}" );
    var data = {
      name: "Fred"
    };
    myTemplate.render( data );  // "name: Fred"

A utility method is provided to render a template directly:

    Template.render( '{{= name }}', { name: "Fred" } );  // "Fred"

Aliasing it works:

    var hugs = Template.render;
    hugs( '{{= name }}', { name: "Fred" } );  // "Fred"


### Predefining templates


Caching and including templates:

    var data = { name: "Fred" };

    Template.tmpl['name'] = Template( "name: {{= name }}" );
    Template.render( 'name', data );  // "name: Fred"
    
    Template( "Your {{= include( 'name' ) }}!" ).render( data );  // "Your name: Fred!"

### Custom tags and functions

Define a custom block tag:

    Template.tags.escape = {
      handler: function () {
        var contents = this.$TRUE.toString( this );  // render the internals
        return contents.replace( /&/g, '&amp;' )
              .replace( /"/g, '&quot;' ).replace( /'/g, '&apos;' )
              .replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
      }
    };
    
    Template( "{{ escape }}<b>HTML</b>{{ end }}" ).render();  // "&lt;b&gt;HTML&lt;/b&gt;"


Define a custom single tag:

    Template.tags.domain = {
      handler: function () {
        return window.location.host;
      }
      single: true
    };

    Template( "domain: {{ domain }}" ).render();  // "domain: github.com"


Define a custom function:

    Template.fn.br = function ( v ) {
      return ( v + '' ).replace( /\n/, '<br>' )
    }

    Template( '{{= br( test ) }}' ).render( { test: 'waffles\njam' } );
    // outputs: "waffles<br>jam"



[1]: http://forum.jquery.com/topic/jquery-templates-proposal
