import React from 'react'
import serialize from 'serialize-javascript'

const HTML = ({ content, store }) => (
  <html>
    <head>
        <meta charSet="utf8"/>
        <title>react-router-redux server rendering example</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,900"/>
        <link rel="stylesheet" href="https://oss.maxcdn.com/semantic-ui/2.1.6/semantic.min.css"/>
        <link rel="stylesheet" href="/css/main.css"/>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
        <script src="https://oss.maxcdn.com/semantic-ui/2.1.6/semantic.min.js"></script>
    </head>
    <body>
    <div>
      <div id="root" dangerouslySetInnerHTML={{ __html: content }}/>
      <div id="devtools"/>
      <script dangerouslySetInnerHTML={{ __html: `window.__initialState__=${serialize(store.getState())};` }}/>
      <script src="/__build__/bundle.js"/>
    </div>
    </body>
  </html>
)

export {HTML}
