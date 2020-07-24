Vue.component('trade-history', {
  props: ['fills', 'userId'],
  computed: {
    userFills: function () {
      return this.fills.filter(
        trade => trade.userId == this.userId
      ).sort(function (a, b) {
        return (a.filledAt < b.filledAt) ? 1 : -1;
      });
    },
  },
  template: `
    <div class="trade-history">
        <h3>My Trade History</h3>
        <table>
            <tr>
                <th>Time</th>
                <th>Side</th>
                <th>Size</th>
                <th>Price</th>
            </tr>
            <tr v-for="fill in userFills">
                <td>{{ fill.filledAt.toLocaleString() }}</td>
                <td>{{ fill.direction === 'buy' ? 'Bought' : 'Sold' }}</td>
                <td>{{ fill.size }}</td>
                <td>{{ fill.price }}</td>
            </tr>
        </table>
    </div>
  `,
});

Vue.component('orderbook-side', {
  props: ['orders', 'title', 'side'],
  computed: {
    collapsedOrders: function () {
      var sizesByPrice = {};
      var side = this.side;
      this.orders.forEach((order) => {
        if (sizesByPrice[order.price] === undefined) {
          sizesByPrice[order.price] = 0;
        }
        sizesByPrice[order.price] += order.size;
      });

      var collapsedOrders = [];
      for ([price, size] of Object.entries(sizesByPrice)) {
        collapsedOrders.push({
          price: price,
          size: size,
        });
      }

      collapsedOrders.sort(function (a, b) {
        if (side === 'bids') {
          return (a.price < b.price) ? 1 : -1;
        } else {
          return (a.price > b.price) ? 1 : -1;
        }
      });

      return collapsedOrders;
    },
  },
  template: `
    <div class="orderbook-side" v-bind:class="[ side ]">
      <h3>{{ title }}</h3>
      <table>
        <tr>
          <th v-if="side == 'asks'">Price</th>
          <th>Size</th>
          <th v-if="side == 'bids'">Price</th>
        </tr>
        <tr v-for="order in collapsedOrders">
          <td v-if="side == 'asks'">{{ order.price }}</td>
          <td>{{ order.size }}</td>
          <td v-if="side == 'bids'">{{ order.price }}</td>
        </tr>
      </table>
    </div>
  `
})

var app = new Vue({
    el: '#app',
		created: function () {
			var that = this;
			this.socket.on('connect', function() {
				console.log('connected');
			});
			this.socket.on('new_order', function(data) {
				that.placeOrder(JSON.parse(data));
			});
		},
    data: {
			socket: io('http://' + location.hostname + ':5000'),
        userId: 1,
        orderDirection: 'buy',
        orderPrice: 0.6, // initial demo values
        orderSize: 12.0,
        fills: [
          { direction: 'buy', price: 0.45, size: 18, filledAt: new Date('Jul 23, 2020 11:00'), userId: 1 },
          { direction: 'sell', price: 0.45, size: 20, filledAt: new Date('Jul 23, 2020 13:00'), userId: 1 },
        ],
        bids: [
          { price: 0.4, size: 10, userId: 1, createdAt: new Date('Jul 23, 2020 13:00') },
          { price: 0.5, size: 15, userId: 1, createdAt: new Date('Jul 23, 2020 13:00') },
          { price: 0.5, size: 15, userId: 2, createdAt: new Date('Jul 23, 2020 14:00') },
        ],
        asks: [
          { price: 0.7, size: 12, userId: 1, createdAt: new Date('Jul 23, 2020 13:00') },
          { price: 0.6, size: 12, userId: 3, createdAt: new Date('Jul 23, 2020 13:00') },
        ],
    },
    computed: {
      sortedBids: function () {
        return this.bids.sort(function (a, b) {
          // match by price/time priority (FIFO)
          if (a.price === b.price) {
            return (a.createdAt > b.createdAt) ? 1 : -1;
          }
          return (a.price < b.price) ? 1 : -1;
        });
      },
      sortedAsks: function () {
        return this.asks.sort(function (a, b) {
          // match by price/time priority (FIFO)
          if (a.price === b.price) {
            return (a.createdAt > b.createdAt) ? 1 : -1;
          }
          return (a.price > b.price) ? 1 : -1;
        });
      },
    },
    methods: {
			submitOrder: function() {
        // form validation
        if (this.orderPrice <= 0) {
          alert('Invalid order price');
          return;
        }
        if (this.orderSize <= 0) {
          alert('Invalid oder size');
        }

				this.socket.emit('new_order', JSON.stringify({
					orderPrice: this.orderPrice,
					orderSize: this.orderSize,
					orderSubmittedAt: new Date(),
					orderDirection: this.orderDirection
				}));
			},
      placeOrder: function (data) {
				console.log(data);
        // check against existing orders
        // note: intentional redundancy for readability purposes
        var remainingSize = data.orderSize;
        if (data.orderDirection === 'buy') {
          let asksToRemove = [];

          // try to match order against asks from the orderbook
          for (let ask of this.sortedAsks) {
            if (data.orderPrice < ask.price || remainingSize <= 0) {
              break; // no matching order or no size left, break off
            }

            let fillSize;
            if (remainingSize >= ask.size) { // remove ask from orderbook
              fillSize = ask.size;
              asksToRemove.push(ask);
              remainingSize -= ask.size;
            } else { // only adjust size
              fillSize = remainingSize
              ask.size -= remainingSize;
              remainingSize = 0;
            }

            // create fills
            this.fills.push({
              direction: 'sell',
              price: ask.price,
              size: fillSize,
              filledAt: data.orderSubmittedAt,
              userId: ask.userId,
            });
            this.fills.push({
              direction: 'buy',
              price: ask.price,
              size: fillSize,
              filledAt: data.orderSubmittedAt,
              userId: this.userId,
            });
          }

          // remove asks which have been filled completely
          for (let ask of asksToRemove) {
            let index = this.asks.indexOf(ask);
            this.asks.splice(index, 1);
          }

        } else if (data.orderDirection === 'sell') {
          let bidsToRemove = [];

          // try to match order against bids from the orderbook
          for (let bid of this.sortedBids) {
            let fillSize;
            if (data.orderPrice > bid.price || remainingSize <= 0) {
              break; // no matching order or no size left, break off
            }

            if (remainingSize >= bid.size) { // remove bid from orderbook
              fillSize = bid.size;
              bidsToRemove.push(bid);
              remainingSize -= bid.size;
            } else { // only adjust size
              fillSize = remainingSize
              bid.size -= remainingSize;
              remainingSize = 0;
            }

            // create fills
            this.fills.push({
              direction: 'buy',
              price: bid.price,
              size: fillSize,
              filledAt: data.orderSubmittedAt,
              userId: bid.userId,
            });
            this.fills.push({
              direction: 'sell',
              price: bid.price,
              size: fillSize,
              filledAt: data.orderSubmittedAt,
              userId: this.userId,
            });
          }

          // remove bids which have been filled completely
          for (let bid of bidsToRemove) {
            let index = this.bids.indexOf(bid);
            this.bids.splice(index, 1);
          }
        }

        if (remainingSize <= 0) {
          return;
        }

        // if remaining size, add it to orderbook
        let order = {
          price: data.orderPrice,
          size: remainingSize,
          userId: this.userId,
          createdAt: data.orderSubmittedAt,
        };
        if (data.orderDirection === 'buy') {
          this.bids.push(order);
        } else if (data.orderDirection === 'sell') {
          this.asks.push(order);
        }
      }
    },
});
