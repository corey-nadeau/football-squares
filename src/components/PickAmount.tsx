import Colors from "./Colors"


const Amount = () => {
    
    

    return (
      <div className='text-center py-5 bg-black text-white h-60'>
        <form>
  
          <label>How many squares would you like to buy?<br></br> They are $1 each: </label>
          <input type='text' id='initals' name='initals' placeholder='#' className='border-2 bg-black text-white px-1 w-12 shadow-md shadow-white'></input>
          <div className='pt-10'><button className='border-2 bg-black text-white rounded-lg p-2 shadow-md shadow-white'>Submit</button></div>
          </form>
        <Colors/>
          
      </div>
    )
  }
  
  export default Amount