# Task background

As a company dealing with environmental commodities, we want to digitalize the market, providin a software solution, which will help companies. One of the services we want to provide is the "live markets" where people can instantly buy or trade goods.

## Your task:
is to provide simple "live markets" - where one can place a bid order to buy good or place an ask order to sell good.

## Functional requirements:
* As a user I want to be able to select a position - buying or selling, volume and price.
* If there's nothing on the market, my order is placed ("limit" order)
* If the market is not empty, check if my order can match any other order(s) on the market.
* Upon successful match I want to see what I bought or sold.

## Technical requirements
* web interface
* the app should provide real-time behavior, i.e. if two people trading with each other, the orders should be visible without reloading of the web page
* No persistend storage, only "session" storage (i.e. upon restart the application should start from blank state)
* Use any language/ framework

## Submission
Fork this repo. When ready, make a pull request. That's it.

### Good luck!
