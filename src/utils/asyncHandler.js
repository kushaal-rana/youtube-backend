const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// How is it working
// step1: const asyncHandler = ()=>{}
// Step2: const asyncHandler = (func)=>{()=>{}} //just remove the curly brackets
// Step2: const asyncHandler = (func)=> async()=>{}

//Accepting function and passing it as argument to another function and executing it
// const asyncHandler = (fn) => async (req, res, next)=>{
//     try{
//         await fn(req,res,next)
//     }
//     catch(error){
//         res.status(error.code || error.message || 500).json({
//             success: false,
//             message: error.message || "Server Error"
//         })
//     }
// } //Now this is a wrapper for a function which requres try catch checking, just pass the function as an argument
