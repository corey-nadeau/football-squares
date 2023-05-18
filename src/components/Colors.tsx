

function Colors() {
  return (
    <div>
      <div className='flex ml-4 pt-5'>
            <div className='border border-white h-7 w-7 md:w-14 md:h-14 pt-1 font-bold text-xs shadow-md shadow-red-500 text-center'>xx</div>
            <h2 className='pl-2 text-xs pt-1'>Red boxes have not been commited, and can be traded.</h2>
            </div>
            <div className='flex ml-4'>
            <div className='border border-white h-7 w-7 md:w-14 md:h-14 pt-1 font-bold text-xs shadow-md shadow-blue-500 text-center'>xx</div>
            <h2 className='pl-2 text-xs pt-1'>Blue boxes are locked!</h2>
            </div>
    </div>
  )
}

export default Colors
