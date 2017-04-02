import React from 'react';
import { BrowserRouter as Router, Route, Link, Redirect} from 'react-router-dom';
import { browserHistory } from 'react-router';


class Breakdown extends React.Component {
  constructor(props) {
    super(props);
    this.sumTax = Number(this.props.data.sumTax);
    this.sumTip = Number(this.props.data.sumTip);
    this.memberCount = this.props.data.members.length;
    this.perPerson = ((this.sumTax + this.sumTip) / this.memberCount);
    this.state = {
      senderName: this.props.data.username,
      senderEmail: this.props.data.email,
      recipientEmail: '',
      subject: '',
      message: ''
    };
  }

  senderEmailChange(e) {
    e.preventDefault;
    this.setState({
      senderEmail: e.target.value
    });
  }

  recipientEmailChange(e) {
    e.preventDefault;
    this.setState({
      recipientEmail: e.target.value
    });
  }

  subjectChange(e) {
    e.preventDefault;
    this.setState({
      subject: e.target.value
    });
  }

  messageChange(e) {
    e.preventDefault;
    this.setState({
      message: e.target.value
    });
  }

  onClick(e) {
    e.preventDefault();

  }

  render() {
    return (
      <div>
          <Link to='/summary' className='back-history'>Calculation Summary</Link>
        <div>
          <div className='receipt-info'>
            <h2>Final Breakdown</h2>
            <h4>Total per person due to {this.props.data.username}</h4>
          </div>
          <div className='receipt-summary'>
            {Object.keys(this.props.data.memberSum).map((member, index) => {
              return (
                <div key={index} className='flex-container receipt-tax'>
                  <span className='flex-column-name'>{member}</span>
                  <span className='flex-column-amount receipt-item-amount'>{(this.props.data.memberSum[member] + this.perPerson).toFixed(2)}</span>
                  { member !== this.props.data.username ? (
                    <span>
                    <a className='button' style={{marginLeft: 25}} href='#openModal'>Email</a>
                    <div id='openModal' className='modalDialog'>
                      <div id='modalWindow'>
                          <div style={{textAlign: 'right'}}>
                            <a href='#close' title='Close' className='close'><b>X</b></a>
                          </div>
                          <p>Send a reminder:</p>
                          <form id='modalFeedback' onSubmit={(e) => { this.props.sendMessage(e, this.state, () => { this.setState({recipientEmail: '', subject: '', message: ''}); window.location.assign('#close'); }); } }>
                           <p><label>Your Name<strong>*</strong><br></br>
                            <input type='text' autoFocus required size='48' name='name' defaultValue={this.state.senderName}></input>
                          </label></p>
                          <p><label>Your Email Address<strong>*</strong><br></br>
                            <input type="email" required title="Please enter a valid email address" size="48" name='email' value={this.state.senderEmail} onChange={this.senderEmailChange.bind(this)}></input>
                          </label></p>
                          <p><label>Recipent's Email Address<strong>*</strong><br></br>
                          <input type="email" required title="Please enter a valid email address" size="48" name='email' value={this.state.recipientEmail} onChange={this.recipientEmailChange.bind(this)}></input>
                          </label></p>
                          <p><label>Subject<br></br>
                            <input type='text' size='48' name='subject' value={this.state.subject} onChange={this.subjectChange.bind(this)}></input>
                          </label></p>
                          <p><label>Message<strong>*</strong><br></br>
                            <textarea required name='message' cols='48' rows='8' value={this.state.message} onChange={this.messageChange.bind(this)}></textarea>
                          </label></p>
                          <p><input type='submit' name='feedbackForm' defaultValue='Send Message'></input>
                          </p>
                          </form>
                        </div>
                    </div>
                    </span>
                    ) : (<span> <div style={{marginLeft: 62.5}}></div></span>)}
                </div>
              );
            })}
          </div>
        </div>
        <div className='sumbit-btn-bar-outer-container'>
            <div className='sumbit-btn-bar-inner-container'>
              <Link
                to='/recent-trips'
                onClick={this.props.recent}
                className='btn btn-primary btn-wide btn-link'
              >Recent Trips</Link>
            </div>
        </div>
      </div>
    );
  }
}

export default Breakdown;

/*  line 29, conditionally render the button. Only display if it's not the same person--if member is not the user.*/
