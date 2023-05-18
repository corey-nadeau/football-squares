import Colors from "./Colors"


const Initial = () => {
    
    

  return (
    <div className='text-center py-10 bg-black text-white h-60'>
      <form>

        <label>Enter your initals to get started: <br></br></label>
        <input type='text' id='initals' name='initals' placeholder='here' className='border-2 bg-black text-white px-1 w-12 shadow-md shadow-white'></input>
        <div className='pt-5'><button className='border bg-black text-white rounded-lg p-2 shadow-md shadow-white'>Submit</button></div>
        </form>
    <Colors/>
       
    </div>
  )
}

export default Initial
