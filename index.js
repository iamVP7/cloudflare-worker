// The job of this worker is to receive the POST method; parse it and get email id to check if any github pages is already created or not.
// If not created send Github API to create the page.
// On successful creation insert into the ClouldFlare KV

// This method will be helping us to handle CORS. this is based on the example given by Worker itself
addEventListener('fetch', event => {
 

  if (event.request.method === "OPTIONS") {
      // Handle CORS preflight requests
      event.respondWith(handleOptions(event.request))
    }
  else if(event.request.method === "POST"){
      event.respondWith(handleRequest(event.request))
  }
  else {
    event.respondWith(
      new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      }),
    )
  }
})
// end of addEventListener function


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};


const ownerName='iamvp7';
const repoName = 'cloudflarepages';
const path = 'pages/conf/';
const finalPath="https://cloudflarepages-9jp.pages.dev/conf/";
const tweetMessage = "https://twitter.com/intent/tweet?text=Join%20the%20Conference ";
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {

let respHeaders = {
      ...corsHeaders,
      "Access-Control-Allow-Headers": "*",
      "content-type": "application/json"
    };
   var userDetailsJSON={};
   userDetailsJSON =JSON.parse(JSON.stringify(await request.json()));
  
   if(request.method === "POST" && 
    userDetailsJSON != null && userDetailsJSON.email != ''){
    
    const message = userDetailsJSON.email;
    const msgUint8 = new TextEncoder().encode(message); 
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
    userDetailsJSON.hash = hashHex;

    // Check is value is present in KV
    const value = await CREATED_PAGE.get(hashHex);

    console.log("the exisitng value is::"+value);

    if(value === null){

      var response = await sendRequest(userDetailsJSON);
      
      var resposneJSON = {};
      console.log(response)

      if(response == 201){
        await CREATED_PAGE.put(hashHex,finalPath+hashHex);
        resposneJSON.url=finalPath+hashHex;
        resposneJSON.message='success';
      }else{
        resposneJSON.message='fail';
      }

      // console.log("response is"+JSON.stringify(resposneJSON))  
      return new Response(JSON.stringify(resposneJSON), {
        headers: respHeaders,
      })
    } // end of if key present check
    else{

    var resposneJSON = {};
    resposneJSON.url=value;
    resposneJSON.message='success';
    return new Response(JSON.stringify(resposneJSON), {
      headers: respHeaders,
    })
    } // end of when key present
  }
  else{
  return new Response("Wrong body", { status: 500 })
  }
}



const html = `import Head from 'next/head'
import styles from '../../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Join</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h2 className={styles.title}>
          Join
        </h2>
        <div>
        <h1 className={styles.title}>GITHUB_NAME</h1> 
      
        </div>
        <img src="GITHUB_URL" alt="Git hub pic" width={128} height={128}/>

        <p>Celberate the conference without fail.</p>
        <p>October 31, 2021 9am-1pm PT / Online.</p>
        
        <a className={styles.twitter_share_button}href="TWEET_CONTENT">Tweet Your Ticket</a>
       </main>
       <footer >
       <section  className={styles.footersection}>
          <a href="https://twitter.com" target="_blank"rel="noopener noreferrer">
            <img  src="/twitter.png" alt="Twitter Logo" width={128} height={128} layout="fixed"/>
          </a>
          <a href="https://facebook.com" target="_blank"rel="noopener noreferrer">
          <img  src="/facebook.png" alt="Facebook Logo" width={128} height={128}/>
          </a>
          <a href="https://linkedin.com" target="_blank"rel="noopener noreferrer">
          <img src="/linkedin.png" alt="Linkedin Logo" width={128} height={128}/>
          </a>
          </section>
        <section className={styles.footer}>
          
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          Made with Love by Community
        </a>
        </section>
      </footer>
    </div>
  )
}
`

async function sendRequest(jsonObjectCame){
  var changedVal=html.replace('GITHUB_NAME',jsonObjectCame.name);
  changedVal=changedVal.replace('GITHUB_EMAIL',jsonObjectCame.email);
  changedVal=changedVal.replace('GITHUB_URL',jsonObjectCame.photo);
  changedVal=changedVal.replace('TWEET_CONTENT',tweetMessage+" "+finalPath+jsonObjectCame.hash);



  var newPath = path+jsonObjectCame.hash+'.js';
  var apiURL = `https://api.github.com/repos/${ownerName}/${repoName}/contents/`+newPath;
  

  
  
  let base64String = btoa(changedVal);

  var githubResponseJSON = {};
  githubResponseJSON.message = 'New Member added '+jsonObjectCame.name;
  githubResponseJSON.content = base64String;
  

const response = await fetch(apiURL, {
        method: 'PUT',
        headers: {
            'Content-Type' : 'application/json',
            'Authorization' : `token ${GITHUB_TOKEN}`,
            'user-agent': 'node.js'
        },
        body: JSON.stringify(githubResponseJSON)
    });
  const results = await gatherResponse(response)
//console.log(results);
    
    return results;

}

async function gatherResponse(response) {
  const { headers } = response
  return response.status;
  /*
  const contentType = headers.get("content-type") || ""
  console.log(contentType)
  if (contentType.includes("application/json")) {
    return JSON.stringify(await response.json())
  }
  else if (contentType.includes("application/text")) {
    return response.text()
  }
  else if (contentType.includes("text/html")) {
    return response.text()
  }
  else {
    return response.text()
  }
  */
}

function handleOptions(request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ){
    // Handle CORS pre-flight request.
    // If you want to check or reject the requested method + headers
    // you can do that here.
    let respHeaders = {
      ...corsHeaders,
    // Allow all future content Request headers to go back to browser
    // such as Authorization (Bearer) or X-Client-Name-Version
      "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers"),
    }

    return new Response(null, {
      headers: respHeaders,
    })
  }
  else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    })
  }
}
