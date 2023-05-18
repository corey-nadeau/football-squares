
import Colors from './Colors'

function Review() {
  return (
    <div className='text-center py-5 bg-black text-white h-60'>
      <div className='px-4'>
        <div id='initials'>Pick your squares! you have<div className='font-extrabold'>7</div>
            <div id='value' className=''>squares remaining<br></br>
            <button className='border bg-black text-white rounded-lg p-2 shadow-md shadow-red-500 mt-2'>Submit</button>
            <p className=' text-xs pt-2'>Once you click submit, your pics are LOCKED</p>
            </div>
            <Colors/>
        </div>
      </div>
    </div>
  )
}

export default Review
