/* 
 * Simple JavaScript templating system.
 *   (c) 2010, Borgar Þorsteinsson
 * 
 * Licenced under the terms of the MIT software licence.
 *   http://www.opensource.org/licenses/mit-license.php
 * 
 */
/*global window */
/*jslint evil: true, forin: true, laxbreak: true */
(function(){

  function map ( a, fn ) {
    var r = [];
    for (var i=0,l=a.length; i<l; i++) {
      r.push( fn( a[i], i ) );
    }
    return r;
  }
  
  function extend ( a, b ) {
    for ( var k in b ) {
      a[ k ] = b[ k ];
    }
    return a;
  }

  function Template ( str ) {
    if ( str in Template.tmpl ) { return Template.tmpl[ str ]; }
    // allow omitting the new operator
    if ( this === window ) { return new Template( str ); }
    this.nodes = this.parse( str );
  }
  
  var T = window.Template = Template;
  
  T.prototype = {

    // Render function
    // * takes a context object, list of context objects, or nothing
    // * returns a rendered template based on the context, or a list of same if input was an list. 
    render: function ( context ) {

      if ( Object.prototype.toString.call(context) === "[object Array]" ) {
        var self = this;
        return map( context, function ( item ) {
          return self.nodes.toString( item );
        });
      }
      // simple render
      return this.nodes.toString( context || {} );
    },

    // Parser
    // * takes a list of token objects
    // * returns a tree of Nodelists
    parse: function ( tokens, until ) {

      // TODO: don't match tags within strings: {{= "}}" }}
      if ( typeof tokens === 'string' ) {
        tokens = tokens.split( /(\{[\{#].*?[\}#]\})/g );
      }

      var nodes = [];
      while ( tokens.length ) {

        var token = tokens.shift(),
            m = token.match( /(\{[\{#])\s*((\=|\w+).*?)\s*[\}#]\}/ );

        // block tag
        if ( m && m[1] === '{{' ) { 

          var tag = m[3],
              args = m[2].substr( m[3].length );

          if ( until && tag in until ) {

            // put token back on token list so calling code knows why it terminated
            tokens.unshift( tag );
            return new T.Nodelist( nodes );

          }
          if ( T.tags[ tag ] ) {

            var block = new T.Node( tag, args );
            block.resolve = this.compile_variable( args );

            if ( !T.tags[ tag ].single ) {

              // all blocks are terminated with "end" and may optionally include "else"
              var list = this.parse( tokens, { 'else':1, 'end':1 } );

              var last = tokens.shift(); // get the terminating tag
              if ( last === 'else' ) {
                block.$TRUE = list;
                list = this.parse( tokens, { 'end':1 } );
                last = tokens.shift(); // get the terminating tag
              }
              if ( last === 'end' ) {
                // we have "true" already, this must be "else"
                if ( block.$TRUE !== '' ) {
                  block.$FALSE = list;
                }
                else {
                  block.$TRUE = list;
                }
              }
              else {
                throw new T.Error( "Unexpected termination by " + last );
              }

            }
            nodes.push( block );

          }
          else {

            throw new T.Error( "Unknown template tag " + tag );

          }
        }

        // comment
        else if (  m && m[1] === '{#' ) { /* noop */  }

        // text
        else {
          nodes.push( token );
        }
      }

      // if out of tokens but have until? ... tags are imbalanced
      if ( until ) {
        var s = [];
        for ( var key in until ) {
          s.push( key );
        }
        throw new T.Error( 'Unmatched block tag, expected: ' + s.join(' or ') );
      }

      return new T.Nodelist( nodes );
    },

    compile_variable: function ( v ) {
      var cleaned = v.replace( /"(\"|[^"])*"|'(\'|[^'])*'|[!=]=+|[><]=/g, '!!!' );
      // disallow: {}, (=, +=, -=, *=, /=, >>=, <<=, >>>=, &=, |=, ^=), (++, --)
      if ( /(^\s*\.|\.\s*$|\+\+|\-\-|[gls]et|new|[{}=])/.test( cleaned ) ) {
        throw new T.Error( 'Illegal template operator "' + RegExp.lastMatch + '" in ' + v );
      }
      else if ( /(abstract|b(oolean|reak|yte)|c(a(se|tch)|har|lass|on(st|tinue))|d(e(bugger|fault|lete)|o(uble)?)|e(lse|num|x(port|tends))|f(inal(ly)?|loat|or|unction)|goto|i(mp(lements|ort)|n(stanceof|t(erface)?)|f)|long|n(ative|ew)|p(ackage|r(ivate|otected)|ublic)|return|s(hort|tatic|uper|witch|ynchronized)|t(hrows?|r(ansient|y))|v(ar|olatile)|w(hile|ith)|yeild)/.test( cleaned ) ) {
        throw new T.Error( 'Illegal reserved word "' + RegExp.lastMatch + '" in ' + v );
      }
      return new Function( '', 'try{with(this){with(Template.vars){with(Template.fn){' + 
        'return [' + v + '];' + 
        '}}}}catch(e){if(Template.SILENT && e instanceof ReferenceError){return '+
        '[Template.INVALID];}throw e;}' );
    }


  };


  // Extend the constructor with what is essentially the interface
  extend(T, {

    // settings:
    SILENT:        true,    // suppress "ignorable" (lookup) errors 
    INVALID:       '',      // when a lookup error is encontered and suppressed, render this string

    // Sugar: Allow render method to be called directly
    render: function ( tmpl, context ) {
      return new T( tmpl ).render( context || {} );
    },

    // The tags do all the heavy lifting:
    tags: {

      // variable nodes are converted to echo block nodes
      '=': {
        handler: function ( v ) { return v; },
        single: true
      },

      'if': {
        handler: function ( v ) {
          return ( v ? this.$TRUE : this.$FALSE ).toString( this );
        }
      },

      // Problem: If errors are suppressed and they resolve as INVALID, then that
      // string will be looped through. Seemingly only EITHER functionality can be supported?
      'each': {
        // TODO: support looping through objects
        handler: function ( v ) {
          var t = this.$TRUE,
              V = T.vars;
          if ( !v || !v.length || typeof v === "string" ) {
            return this.$FALSE.toString( this );
          }
          var r = map( v, function ( item, i ) {
            V.each = {
              counter: i,
              first: i===0,
              last: i===v.length
            };
            return t.toString( item );
          });
          delete V.each;
          return r;
        }
      },

      'include': {
        handler: function ( v ) {
          return ( v in T.tmpl ) 
              ? T.render( v, this ) 
              : this.$FALSE.toString( this )
              ;
        },
        single: true
      }

    },

    // interface for filters
    fn: {
      'upper': function ( v ) { return ( v + '' ).toUpperCase(); },
      'lower': function ( v ) { return ( v + '' ).toLowerCase(); },
      'escape': function ( v ) {
        return ( v + '' )
            .replace( /&/g, '&amp;' )
            .replace( /"/g, '&quo;' )
            .replace( /</g, '&lt;' )
            .replace( />/g, '&gt;' )
            ; 
      }
    },

    // precompiled template cache go here
    tmpl: {},

    // used by tags to assign temp things like looping numbers...
    vars: {},

    // Error instance used by the templates
    Error: function ( error ) {
      this.message = error;
      this.name = 'TemplateError';
      this.toString = function () { return this.name + ': "' + this.message + '"'; };
    },

    // node constructors
    Node: function ( tag, args ) {
      this.tag = tag;
      this.args = args;
      this.$TRUE = this.$FALSE = '';
    },

    Nodelist: function ( arr ) {
      // assign all of arr into this object simulating an array
      this.length = 0;
      Array.prototype.push.apply( this, arr || [] );
    }

  });


  T.Node.prototype = {

    toString: function ( data ) {
      // make sure firebug and other debuggers don't choke on this
      if ( !arguments.length ) { return '<Template Node>'; }
      data = data || {};
      var r = this.resolve.call( data );
      data.$TRUE  = this.$TRUE;
      data.$FALSE = this.$FALSE;
      var tag = T.tags[ this.tag ].handler;
      if ( !tag ) {
        throw new T.Error( 'The "' + this.tag + '" tag is missing a handler function' );
      } 
      return ( r.length === 1 ) ? tag.call( data, r[0] ) : tag.apply( data, r );
    }

  };

  T.Nodelist.prototype.toString = function ( data ) {
    var j = [];
    for (var i=0,s; i<this.length; i++) {
      s = this[i].toString( data );
      if ( s.join ) {
        j = j.concat( s );
      }
      else {
        j[ j.length ] = s;
      }
    }
    return j.join('');
  };

}());