import axios from "axios";
import fs from "fs";
import sgMail from "@sendgrid/mail";

/*
This program works by giving a list of sites to scrape through. 
You need to specify what to look for in the HTML in order to tell if the PS5 is available (though this program could check for any item)
You can also choose to check if this HTML element you are looking for is included in the website or if it is not.
For example it can check if the HTML button that says 'sold out' is no longer there.
Or it can check if an HTML button says 'buy now'.

By default 3 sites will be checked; bestbuy, amazon, and gamestop. 

In order to add our own you need to add to the siteList array, this is an array of objects.
The objects need the following data to properly check through the site
'sitename' is the name of the site
'emailed' is if an email was sent yet set this to false. 
'itemName' is the name of the item. 
'siteURL' is the URL of the site to check.
'HTMLElement' is the HTML element to search for.
'includes' is if is checking if this HTML element exists or not.
*/

// Site list
const siteList = [
{siteName: "bestbuy", emailed: false, itemName: "PS5", siteURL: "https://www.bestbuy.com/site/sony-playstation-5-digital-edition-console/6430161.p?skuId=6430161", HTMLElement: "btn btn-disabled btn-lg btn-block add-to-cart-button", includes: true},
{siteName: "amazon", emailed: false, itemName: "PS5", siteURL: "https://www.amazon.com/PlayStation-5-Digital/dp/B08FC6MR62/ref=sr_1_1?crid=3N0CE2SS3RK2B&dchild=1&keywords=playstation+5+digital+edition&qid=1606091495&sprefix=playstation+5+d%2Caps%2C180&sr=8-1", HTMLElement: 'Currently unavailable.', includes: true},
{siteName: "gamestop", emailed: false, itemName: "PS5", siteURL: "https://www.gamestop.com/video-games/playstation-5/consoles/products/playstation-5-digital-edition/11108141.html?condition=New", HTMLElement: '{"productInfo":{"sku":"225171","productID":"11108141","name":"PlayStation 5 Digital Edition","category":"Video Games/PlayStation 5/Consoles","brand":"Sony","subGenre":"","platform":"PlayStation 5","condition":"New","variant":"New","genre":"","availability":"Not Available","productType":"regular","zoneSource":"PDP"},"price":{"sellingPrice":"399.99","basePrice":"399.99","currency":"USD"}}', includes: true}]

const emailList = ["example@email.com"] // Email addresses go here, this is a list so it can handle multiple emails 

// Downloads the websites HTML
const getSite = (site: string, siteName: string) => {

    return new Promise((resolve, reject) => {

        axios.get(site).then((response) => {

            resolve({passed: true, data: response.data});

        }).catch((e) => {

            console.log("\nError getting site data", siteName, e.message);
            resolve({passed: false})
        })

    })
}

const sendEmail = async(siteName: string, siteLink: string, emailSent: boolean) => {

    // If there was already an alert set for a specific site it will not send the email again, so it doesn't get caught in a loop. Restarting this script will clear this.
    if (emailSent) {
        console.log("email already sent");
        return;
    }

    try {

        for (let email of emailList) { // for loop that sends to all of the emails in the list.

            const sendGridAPIKey = ""; // Sendgrip API key, sendgrid is the module used to send the email when there is a PS5 available, you must create a sendgrid account.
            const sendGridEmail = ""; // This is the email address you'll see when the alert email is sent.

            sgMail.setApiKey(sendGridAPIKey);

            // The message that will be sent to your email when the item is avaiable, change this if you are searching for a differt item.
            const msg = {
                to: email,
                from: sendGridEmail,
                subject: "PS5 Available alert!", 
                text: `Playstation 5 available at the site ${siteName}, the link is ${siteLink}`
            }

            await sgMail.send(msg);

            console.log("sent email alert", email);
        }

    } catch (e) {
        console.log("Send email error", e.message);
    }

}

// Makes the program wait a certain amount of time before restarting the loop and checking the websites again.
const sleep = () => {

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(true)
        }, 1000 * 60 * 3) // In milliseconds, default is 3 minutes, the * 3 represents the amount of minutes.
    })
}

// Function that checks if the HTML is included or not in the webpage.
// This just turns all of the HTML into a string, and uses the build in includes function to check if it is in the string.
const searchSite = (data: string, stringToSearchFor: string, siteName: string, includes: boolean) => {

    try {

        if (includes) {
            if (data.includes(stringToSearchFor)) {
                return true;
            }
        } else {
            if (!data.includes(stringToSearchFor)) {
                return true;
            }
        }

        return false;

    } catch (e) {

        console.log("\nerror seaching through site", siteName);
        return false;
    }
}


// Main function, will loop forever and check all of the sites in the list. 
const main = async() => {

    while (true) {

        for (let site of siteList) {

            // Downloads site HTML
            const siteData = await getSite(site.siteURL, site.siteName) as {passed: boolean, data? : string}
    
            // If no data there was an error, just skip. There can be errors if the host blocks the request, but usually it will be unblocked very quickly.
            if (!siteData.passed || !siteData.data) continue;
    
            if (site.siteName === "bestbuy" && !site.emailed) {
    
                // Searches sites
                const siteSoldout = searchSite(siteData.data, site.HTMLElement, site.siteName, site.includes);

                if (siteSoldout) {
                    console.log("\nSite Sold Out", site.siteName, site.itemName);
                } else {
                    // Sends email if site is not sold out.
                    console.log("\nSite not sold out", site.siteName, site.itemName)
                    await sendEmail(site.siteName, site.siteURL, site.emailed);
                    site.emailed = true;
                }
    
            } else if (site.siteName === "amazon" && !site.emailed) {
    
                const siteSoldout = searchSite(siteData.data, site.HTMLElement, site.siteName, site.includes);
    
                if (siteSoldout) {
                    console.log("\nSite Sold Out", site.siteName, site.itemName);
                } else {
                    console.log("\nSite not sold out", site.siteName, site.itemName);
                    await sendEmail(site.siteName, site.siteURL, site.emailed);
                    site.emailed = true;
                }
    
            } else if (site.siteName === "gamestop" && !site.emailed) {
    
                const siteSoldout = searchSite(siteData.data, site.HTMLElement, site.siteName, site.includes);
    
                if (siteSoldout) {
                    console.log("\nSite Sold Out", site.siteName, site.itemName);
                } else {
                    console.log("\nSite not sold out", site.siteName, site.itemName);
                    await sendEmail(site.siteName, site.siteURL, site.emailed);
                    site.emailed = true;
                }
            } 
    
        }

        // Sleeps/pauses the loop for a specified amount of time.
        console.log("\nSleeping");
        await sleep();
    }
}

main();