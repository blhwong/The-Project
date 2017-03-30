import React from 'react';
import ReactDOM from 'react-dom';
import TripEntry from './TripEntry.jsx';
import { BrowserRouter as Router, Route, Link, Redirect} from 'react-router-dom';

class TripSummary extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    // const data = {
    //   sumBill: '88.00',
    //   sumTax: '',
    //   sumTip: 0,
    //   sumTotal: 95.92,
    //   members: ['Brandon', 'Kai'],
    //   tripName: 'testing',
    //   username: 'Brandon Wong',
    //   items: [[{amount: "42.00", members: ["Brandon Wong"], name: "Pasta"}]]
    // }
    return(
      <div className='page-container'>
        <h1>Most Recent Trips</h1>
        <Link to="/summary" onClick={this.props.setSummary} className='trip-summary'>Test</Link>
        <div className='trip-summary'>{this.props.data.recent.map((item,index) => {
          return (<p key={index} >{item.name}</p>)
        })}
        </div>
      </div>
    )
  }
}

export default TripSummary;
